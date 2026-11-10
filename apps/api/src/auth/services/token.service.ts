import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as crypto from 'crypto';
import type { CookieOptions } from 'express';
import {
  COOKIE_ACCESS_PATH,
  COOKIE_REFRESH_PATH,
  ACCESS_TOKEN_TTL_MS,
  REFRESH_TOKEN_TTL_MS,
  TOKEN_TYPE_ACCESS,
  TOKEN_TYPE_REFRESH,
} from '../auth.constants';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
  tokenVersion: number;
  type: typeof TOKEN_TYPE_ACCESS;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  familyId: string;
  type: typeof TOKEN_TYPE_REFRESH;
}

@Injectable()
export class TokenService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiresIn: string;
  private readonly refreshTokenExpiresIn: string;
  private readonly isProduction: boolean;
  private readonly cookieDomain?: string;
  private readonly cookieSecure: boolean;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.accessTokenSecret = this.configService.get<string>('app.auth.accessTokenSecret') ?? '';
    this.refreshTokenSecret = this.configService.get<string>('app.auth.refreshTokenSecret') ?? '';
    this.accessTokenExpiresIn =
      this.configService.get<string>('app.auth.accessTokenExpiresIn') ?? '15m';
    this.refreshTokenExpiresIn =
      this.configService.get<string>('app.auth.refreshTokenExpiresIn') ?? '7d';
    this.isProduction = this.configService.get<string>('app.nodeEnv') === 'production';
    this.cookieDomain = this.configService.get<string | undefined>('app.cookieDomain');
    this.cookieSecure =
      this.configService.get<boolean>('app.cookieSecure') ?? this.isProduction;
  }

  /** Generates a signed short-lived JWT access token. */
  async generateAccessToken(user: {
    id: string;
    email: string;
    role: string;
    tokenVersion: number;
  }): Promise<string> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
      type: TOKEN_TYPE_ACCESS,
    };

    const options: JwtSignOptions = {
      secret: this.accessTokenSecret,
      algorithm: 'HS256',
      expiresIn: this.accessTokenExpiresIn as `${number}m`,
    };

    return this.jwtService.signAsync(payload, options);
  }

  /** Generates a signed long-lived JWT refresh token with unique jti and familyId. */
  async generateRefreshToken(userId: string, tokenId: string, familyId: string): Promise<string> {
    const payload: RefreshTokenPayload = {
      sub: userId,
      jti: tokenId,
      familyId,
      type: TOKEN_TYPE_REFRESH,
    };

    const options: JwtSignOptions = {
      secret: this.refreshTokenSecret,
      algorithm: 'HS256',
      expiresIn: this.refreshTokenExpiresIn as `${number}d`,
    };

    return this.jwtService.signAsync(payload, options);
  }

  /** Computes a cryptographically secure SHA-256 hex digest for storage in PostgreSQL. */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /** Verifies and decodes a refresh JWT using REFRESH_TOKEN_SECRET. */
  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.refreshTokenSecret,
        algorithms: ['HS256'],
      });

      if (
        payload.type !== TOKEN_TYPE_REFRESH ||
        typeof payload.sub !== 'string' ||
        payload.sub.length === 0 ||
        typeof payload.jti !== 'string' ||
        payload.jti.length === 0 ||
        typeof payload.familyId !== 'string' ||
        payload.familyId.length === 0
      ) {
        throw new UnauthorizedException('Invalid token type');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /** Express cookie options for the short-lived access token. */
  getAccessCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.cookieSecure,
      sameSite: 'lax',
      path: COOKIE_ACCESS_PATH,
      ...(this.cookieDomain ? { domain: this.cookieDomain } : {}),
      maxAge: ACCESS_TOKEN_TTL_MS,
    };
  }

  /** Express cookie options for the long-lived refresh token scoped to auth routes. */
  getRefreshCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.cookieSecure,
      sameSite: 'lax',
      path: COOKIE_REFRESH_PATH,
      ...(this.cookieDomain ? { domain: this.cookieDomain } : {}),
      maxAge: REFRESH_TOKEN_TTL_MS,
    };
  }

  /** Options for immediately expiring and clearing the access cookie. */
  getClearAccessCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.cookieSecure,
      sameSite: 'lax',
      path: COOKIE_ACCESS_PATH,
      ...(this.cookieDomain ? { domain: this.cookieDomain } : {}),
      maxAge: 0,
    };
  }

  /** Options for immediately expiring and clearing the refresh cookie. */
  getClearRefreshCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.cookieSecure,
      sameSite: 'lax',
      path: COOKIE_REFRESH_PATH,
      ...(this.cookieDomain ? { domain: this.cookieDomain } : {}),
      maxAge: 0,
    };
  }
}
