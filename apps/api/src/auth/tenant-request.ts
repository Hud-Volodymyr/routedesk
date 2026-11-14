import type { Request } from 'express';

export interface AuthenticatedUser {
  sub: string;
  groups: string[];
}

export interface TenantRequest extends Request {
  tenantId?: string;
  user?: AuthenticatedUser;
}
