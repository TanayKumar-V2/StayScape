import type { Request } from 'express';

/**
 * List of loopback / link-local IP literals (exact match) that are trusted by
 * name in a dev environment. In production, explicit TRUSTED_PROXIES entries
 * decide which upstream hop may set X-Forwarded-For.
 */
const LOOPBACK_ALIASES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost']);

export interface ClientIpOptions {
  /**
   * Entries are compared against the *direct socket address* of the request.
   * Accepted forms:
   *  - "loopback"        -> 127.0.0.1 / ::1 / ::ffff:127.0.0.1
   *  - a literal IP      -> "10.0.0.5", "fd00::9", "::ffff:10.0.0.5"
   *  - a node-net CIDR   -> "10.0.0.0/8", "172.31.0.0/16", "192.168.0.0/16"
   * Empty/undefined -> trust nothing: X-Forwarded-For is ignored entirely.
   */
  trustedProxies: string[];
}

function normalizeIp(ip: string): string {
  return ip.trim().toLowerCase().replace(/^::ffff:/, '');
}

/** Minimal IPv4 CIDR match (IPv6-CIDR matching is intentionally unsupported). */
function matchesCidr(candidate: string, cidr: string): boolean {
  const [base, bitsRaw] = cidr.split('/');
  const bits = parseInt(bitsRaw ?? '', 10);
  if (!base || !Number.isInteger(bits) || bits < 0 || bits > 32) return false;

  const toInt = (ip: string): number | null => {
    const parts = ip.split('.');
    if (parts.length !== 4) return null;
    let value = 0;
    for (const part of parts) {
      const n = Number(part);
      if (!Number.isInteger(n) || n < 0 || n > 255) return null;
      value = (value << 8) | n;
    }
    return value >>> 0;
  };

  const baseInt = toInt(base);
  const candidateInt = toInt(candidate);
  if (baseInt === null || candidateInt === null) return false;

  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (baseInt & mask) === (candidateInt & mask);
}

function isTrusted(socketIp: string, trustedProxies: string[]): boolean {
  const socket = normalizeIp(socketIp);

  for (const entry of trustedProxies) {
    const target = entry.trim();
    if (!target) continue;

    if (target.toLowerCase() === 'loopback' && LOOPBACK_ALIASES.has(socket)) {
      return true;
    }

    if (target.includes('/')) {
      if (matchesCidr(socket, target)) return true;
      continue;
    }

    if (normalizeIp(target) === socket) return true;
  }

  return false;
}

/**
 * Derives the connecting client IP without blindly trusting spoofable headers.
 *
 * Only trusts `X-Forwarded-For` (first untrusted hop) when the request arrives
 * from a configured trusted proxy. Otherwise the TCP socket address is used.
 *
 * IMPORTANT RATE-LIMIT NOTE: a forged X-Forwarded-For must never rotate the
 * rate-limit key. This function guarantees that unless the socket peer itself
 * is a configured proxy, the header is ignored.
 */
export function extractClientIp(req: Request, trustedProxies: string[] = []): string {
  const socketIp =
    req.ip ??
    req.socket?.remoteAddress ??
    (req.connection?.remoteAddress as string | undefined) ??
    '127.0.0.1';

  let forwarded: string | string[] | undefined;
  if (typeof req.headers['x-forwarded-for'] === 'string') {
    forwarded = req.headers['x-forwarded-for'] as string;
  } else if (Array.isArray(req.headers['x-forwarded-for'])) {
    forwarded = (req.headers['x-forwarded-for'] as string[]).join(',');
  }
  if (!isTrusted(socketIp, trustedProxies)) {
    return socketIp;
  }

  if (typeof forwarded === 'string') {
    const firstHop = forwarded.split(',')[0]?.trim().toLowerCase().replace(/^\[|\]$/g, '');
    if (firstHop) {
      // Only accept plausible IP literals from upstream, never opaque strings.
      const ipv4 = /^\d{1,3}(\.\d{1,3}){3}$/;
      const ipv6 = /^[0-9a-f:]+$/;
      if (ipv4.test(firstHop) || ipv6.test(firstHop)) {
        return firstHop;
      }
    }
  }

  return socketIp;
}

export { isTrusted, matchesCidr, normalizeIp };
