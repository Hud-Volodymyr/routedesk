import { SetMetadata } from '@nestjs/common';

export type Role = 'admin' | 'dispatcher' | 'driver';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: [Role, ...Role[]]) =>
  SetMetadata(ROLES_KEY, roles);
