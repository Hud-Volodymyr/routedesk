import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { TenantRequest } from './tenant-request.js';

export const TenantId = createParamDecorator((_data: unknown, context: ExecutionContext): string => {
  const { tenantId } = context.switchToHttp().getRequest<TenantRequest>();
  if (!tenantId) {
    throw new Error('@TenantId() used on a route without a tenant');
  }
  return tenantId;
});
