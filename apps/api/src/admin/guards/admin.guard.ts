import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountStatus, UserRole } from '@prisma/client';

export interface AuthenticatedAdminUser {
  id: string;
  email: string;
  role: UserRole;
  tokenVersion: number;
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user?: { id?: unknown; tokenVersion?: unknown };
      adminUser?: AuthenticatedAdminUser;
    }>();
    const user = request.user;

    // 1. Authenticated user must exist on the request (populated by JwtStrategy)
    if (!user || typeof user.id !== 'string' || user.id.length === 0) {
      throw new UnauthorizedException(
        'Authentication required to access administrative resources.',
      );
    }

    // 2. Query actual user from database to ensure fresh state and prevent trusting any client-supplied role
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        tokenVersion: true,
      },
    });

    if (!dbUser) {
      throw new UnauthorizedException('Administrator account no longer exists.');
    }

    // 3. Confirm status is ACTIVE
    if (dbUser.status !== AccountStatus.ACTIVE) {
      throw new ForbiddenException('Administrator account is suspended or inactive.');
    }

    // 4. Confirm role is ADMIN
    if (dbUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Access denied: administrator privileges required.');
    }

    // 5. Verify tokenVersion has not been invalidated
    if (typeof user.tokenVersion === 'number' && dbUser.tokenVersion !== user.tokenVersion) {
      throw new UnauthorizedException('Administrator session has expired. Please log in again.');
    }

    // Attach fresh verified administrator identity to request
    request.adminUser = {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      tokenVersion: dbUser.tokenVersion,
    };

    return true;
  }
}
