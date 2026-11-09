import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestWithHost } from './decorators/current-host.decorator';

@Injectable()
export class HostGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithHost>();
    const userId = request.user?.id;

    if (!userId) {
      throw new ForbiddenException('Authentication required to access host services');
    }

    const hostProfile = await this.prisma.hostProfile.findUnique({
      where: { userId },
    });

    if (!hostProfile) {
      throw new ForbiddenException('Host profile required. Please complete host onboarding.');
    }

    if (hostProfile.status !== 'ACTIVE') {
      throw new ForbiddenException('Host account is suspended.');
    }

    request.hostProfile = hostProfile;
    return true;
  }
}
