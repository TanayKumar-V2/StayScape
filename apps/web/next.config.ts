import type { NextConfig } from 'next';

/**
 * Origins derived at build time. Credentials are NOT stored here — these are
 * public deployment endpoints and are provided by environment files.
 */
function resolveOrigin(value: string | undefined, fallback: string): string {
  try {
    return new URL(value ?? fallback).origin;
  } catch {
    return fallback;
  }
}

const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1';
const socketUrl = process.env['NEXT_PUBLIC_SOCKET_URL'] ?? apiUrl.replace(/\/api\/v1\/?$/, '');

const apiOrigin = resolveOrigin(apiUrl, 'http://localhost:4000');
const socketOrigin = resolveOrigin(socketUrl, 'http://localhost:4000');

// dev needs 'unsafe-eval' for the React refresh runtime; prod never gets it
const isDev = process.env.NODE_ENV !== 'production';

const connectSources = new Set<string>([
  "'self'",
  apiOrigin,
  socketOrigin,
  // Razorpay checkout posts to its capture/verification endpoints
  'https://api.razorpay.com',
]);
if (isDev) {
  connectSources.add(`ws://localhost:${process.env.PORT ?? 3000}`);
  connectSources.add('ws://localhost:4000');
}

const cspDirectives = [
  `default-src 'self'`,
  // Next.js hydration + Razorpay SDK inject inline/eval scripts; docs require it.
  // TODO(Phase 12): adopt nonce-based strict CSP via middleware.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://checkout.razorpay.com`,
  `style-src 'self' 'unsafe-inline'`,
  // next/font self-hosts fonts at build time; no runtime font CDN needed
  `font-src 'self' data:`,
  `img-src 'self' data: blob: https://images.unsplash.com https://res.cloudinary.com https://*.tile.openstreetmap.org`,
  `connect-src ${Array.from(connectSources).join(' ')}`,
  `frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com`,
  `worker-src 'self' blob:`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
  `upgrade-insecure-requests`,
];

const csp = cspDirectives.join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    // geolocation stays available to the app itself for stay search UX
    value: 'camera=(), microphone=(), payment=(self "https://checkout.razorpay.com")',
  },
];

if (!isDev) {
  securityHeaders.push({
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  });
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  async headers() {
    return [
      {
        // Apply security headers to every route, including redirects, which
        // bypass "use client"-level mitigations.
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
