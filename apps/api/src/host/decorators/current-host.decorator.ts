import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { HostProfile } from '@prisma/client';
import type { Request } from 'express';

export interface RequestWithHost extends Request {
  user?: { id: string; email: string; role: string };
  hostProfile?: HostProfile;
}

export const CurrentHost = createParamDecorator(
  (data: keyof HostProfile | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithHost>();
    if (!request.hostProfile) {
      return null;
    }
    return data ? request.hostProfile[data] : request.hostProfile;
  },
);
