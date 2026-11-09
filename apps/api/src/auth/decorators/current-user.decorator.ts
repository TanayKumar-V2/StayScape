import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface AuthenticatedUserPayload {
  id: string;
  email: string;
  role: string;
  tokenVersion: number;
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request & { user?: AuthenticatedUserPayload }>();
    if (!request.user) {
      return null;
    }
    return data ? request.user[data] : request.user;
  },
);
