import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedAdminUser } from '../guards/admin.guard';

export const AdminUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedAdminUser => {
    const request = ctx.switchToHttp().getRequest<{
      adminUser?: AuthenticatedAdminUser;
      user?: AuthenticatedAdminUser;
    }>();
    const user = request.adminUser ?? request.user;
    if (!user) throw new Error('Admin identity was not attached to the request');
    return user;
  },
);
