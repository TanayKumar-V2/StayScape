import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { AUTH_COOKIE_ACCESS, TOKEN_TYPE_ACCESS } from '../auth.constants';
import { AccessTokenPayload } from '../services/token.service';

/** Custom extractor that reads the access token from the HTTP-only cookie or Bearer header fallback. */
function cookieOrBearerExtractor(req: Request): string | null {
  if (req?.cookies && typeof req.cookies === 'object' && req.cookies[AUTH_COOKIE_ACCESS]) {
    return req.cookies[AUTH_COOKIE_ACCESS] as string;
  }
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = configService.get<string>('app.auth.accessTokenSecret') ?? '';
    super({
      jwtFromRequest: cookieOrBearerExtractor,
      ignoreExpiration: false,
      secretOrKey: secret,
      algorithms: ['HS256'],
    });
  }

  async validate(payload: AccessTokenPayload) {
    if (
      !payload ||
      typeof payload.sub !== 'string' ||
      payload.sub.length === 0 ||
      typeof payload.tokenVersion !== 'number' ||
      !Number.isInteger(payload.tokenVersion) ||
      typeof payload.email !== 'string'
    ) {
      throw new UnauthorizedException('Invalid token claims');
    }

    if (payload.type !== TOKEN_TYPE_ACCESS) {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        tokenVersion: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is suspended');
    }

    // Invalidate access token if tokenVersion was incremented (e.g. logout-all)
    if (user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Session invalidated. Please sign in again.');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };
  }
}
