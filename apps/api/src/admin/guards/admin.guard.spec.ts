import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AccountStatus, UserRole } from '@prisma/client';
import { AdminGuard } from './admin.guard';
import { PrismaService } from '../../prisma/prisma.service';

describe('AdminGuard', () => {
  let guard: AdminGuard;
  let prismaService: { user: { findUnique: jest.Mock } };

  beforeEach(() => {
    prismaService = {
      user: {
        findUnique: jest.fn(),
      },
    };

    guard = new AdminGuard(prismaService as unknown as PrismaService);
  });

  const createMockContext = (user?: any): ExecutionContext => {
    const req: any = { user };

    return {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as unknown as ExecutionContext;
  };

  it('should throw UnauthorizedException if user is missing on request', async () => {
    const context = createMockContext(undefined);
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if user not found in DB', async () => {
    const context = createMockContext({ id: 'user-1', tokenVersion: 1 });
    prismaService.user.findUnique.mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw ForbiddenException if user status is SUSPENDED', async () => {
    const context = createMockContext({ id: 'user-1', tokenVersion: 1 });
    prismaService.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'admin@stayscape.com',
      role: UserRole.ADMIN,
      status: AccountStatus.SUSPENDED,
      tokenVersion: 1,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException if user role is not ADMIN', async () => {
    const context = createMockContext({ id: 'user-2', tokenVersion: 1 });
    prismaService.user.findUnique.mockResolvedValue({
      id: 'user-2',
      email: 'guest@stayscape.com',
      role: UserRole.USER,
      status: AccountStatus.ACTIVE,
      tokenVersion: 1,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should throw UnauthorizedException if tokenVersion does not match', async () => {
    const context = createMockContext({ id: 'admin-1', tokenVersion: 1 });
    prismaService.user.findUnique.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@stayscape.com',
      role: UserRole.ADMIN,
      status: AccountStatus.ACTIVE,
      tokenVersion: 2, // revoked
    });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should allow access and return true for valid active ADMIN user', async () => {
    const context = createMockContext({ id: 'admin-1', tokenVersion: 3 });
    prismaService.user.findUnique.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@stayscape.com',
      role: UserRole.ADMIN,
      status: AccountStatus.ACTIVE,
      tokenVersion: 3,
    });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });
});
