import { SetMetadata, CustomDecorator } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../auth.constants';

export const Roles = (...roles: UserRole[]): CustomDecorator<string> =>
  SetMetadata(ROLES_KEY, roles);
