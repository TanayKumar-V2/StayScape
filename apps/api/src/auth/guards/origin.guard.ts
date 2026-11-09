import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class OriginGuard implements CanActivate {
  private readonly logger = new Logger(OriginGuard.name);
  private readonly allowedOrigin: string;

  constructor(private readonly configService: ConfigService) {
    this.allowedOrigin = this.configService.get<string>('app.webOrigin') ?? 'http://localhost:3000';
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method.toUpperCase();

    // Safe read-only HTTP methods do not require CSRF origin validation
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    const origin = request.headers['origin'];
    // If the request was made from a browser, Origin is always attached.
    // If an Origin header is explicitly supplied, it MUST match the configured WEB_ORIGIN.
    if (origin) {
      if (origin !== this.allowedOrigin) {
        this.logger.warn(
          `Rejected untrusted origin: "${origin}". Expected: "${this.allowedOrigin}"`,
        );
        throw new ForbiddenException('Invalid request origin');
      }
    }

    return true;
  }
}
