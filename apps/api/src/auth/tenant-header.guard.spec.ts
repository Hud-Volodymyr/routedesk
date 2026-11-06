import { randomUUID } from 'node:crypto';
import { HttpException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Public } from './public.decorator.js';
import { TenantHeaderGuard } from './tenant-header.guard.js';

class ProtectedController {
  handle(this: void): void {}
}

@Public()
class PublicController {
  handle(this: void): void {}
}

class MixedController {
  @Public()
  open(this: void): void {}

  closed(this: void): void {}
}

type Handler = () => void;

function contextFor(
  controller: new () => object,
  handler: Handler,
  headers: Record<string, string>,
): ExecutionContext {
  const lowerCased = Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]),
  );
  const lookup = (name: string) => lowerCased[name.toLowerCase()];
  const request = { headers: lowerCased, header: lookup, get: lookup };
  return {
    getHandler: () => handler,
    getClass: () => controller,
    getType: () => 'http',
    getArgs: () => [request],
    getArgByIndex: (index: number) => [request][index],
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => () => undefined,
    }),
  } as unknown as ExecutionContext;
}

function statusOf(run: () => unknown): number | undefined {
  try {
    run();
  } catch (error) {
    if (error instanceof HttpException) {
      return error.getStatus();
    }
    throw error;
  }
  return undefined;
}

describe('TenantHeaderGuard', () => {
  const guard = new TenantHeaderGuard(new Reflector());
  const protectedHandle = ProtectedController.prototype.handle;

  it('TENANT-1: accepts any UUID in X-Tenant-Id', () => {
    const context = contextFor(ProtectedController, protectedHandle, {
      'X-Tenant-Id': randomUUID(),
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('TENANT-1: rejects a request without X-Tenant-Id with 401', () => {
    const context = contextFor(ProtectedController, protectedHandle, {});

    expect(statusOf(() => guard.canActivate(context))).toBe(401);
  });

  it.each([
    'kyiv',
    `${randomUUID()}0`,
    randomUUID().replaceAll('-', ''),
    `{${randomUUID()}}`,
  ])('TENANT-1: rejects X-Tenant-Id=%j with 401', (value) => {
    const context = contextFor(ProtectedController, protectedHandle, {
      'X-Tenant-Id': value,
    });

    expect(statusOf(() => guard.canActivate(context))).toBe(401);
  });

  it('TENANT-2: lets a handler of a @Public() controller through without the header', () => {
    const context = contextFor(
      PublicController,
      PublicController.prototype.handle,
      {},
    );

    expect(guard.canActivate(context)).toBe(true);
  });

  it('TENANT-2: lets a @Public() handler through without the header', () => {
    const context = contextFor(
      MixedController,
      MixedController.prototype.open,
      {},
    );

    expect(guard.canActivate(context)).toBe(true);
  });

  it('TENANT-2: still protects the unmarked handlers next to a @Public() one', () => {
    const context = contextFor(
      MixedController,
      MixedController.prototype.closed,
      {},
    );

    expect(statusOf(() => guard.canActivate(context))).toBe(401);
  });
});
