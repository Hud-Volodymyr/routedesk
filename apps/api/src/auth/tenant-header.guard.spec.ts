import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Public } from './public.decorator.js';
import { TenantHeaderGuard } from './tenant-header.guard.js';
import type { TenantRequest } from './tenant-request.js';

const TENANT_ID = '6f1c2b0a-3d4e-4f5a-8b6c-7d8e9f0a1b2c';

class PrivateController {
  handle(): void {}
}

@Public()
class PublicController {
  handle(): void {}
}

function contextFor(
  controller: typeof PrivateController | typeof PublicController,
  headers: Record<string, string>,
): { context: ExecutionContext; request: TenantRequest } {
  const request = {
    header: (name: string) => headers[name.toLowerCase()],
  } as TenantRequest;
  const context = {
    getHandler: () => controller.prototype.handle,
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

describe('TenantHeaderGuard', () => {
  const guard = new TenantHeaderGuard(new Reflector());

  it('accepts a UUID header and stores it on the request', () => {
    const { context, request } = contextFor(PrivateController, {
      'x-tenant-id': TENANT_ID,
    });

    expect(guard.canActivate(context)).toBe(true);
    expect(request.tenantId).toBe(TENANT_ID);
  });

  it('rejects a missing header', () => {
    const { context } = contextFor(PrivateController, {});

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects a header that is not a UUID', () => {
    const { context } = contextFor(PrivateController, {
      'x-tenant-id': 'kyiv',
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('lets public routes through without a header', () => {
    const { context, request } = contextFor(PublicController, {});

    expect(guard.canActivate(context)).toBe(true);
    expect(request.tenantId).toBeUndefined();
  });
});
