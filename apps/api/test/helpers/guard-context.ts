import { HttpException, type ExecutionContext } from '@nestjs/common';
import type { TenantRequest } from '../../src/auth/tenant-request.js';

export type Handler = () => void;

export function requestWith(
  headers: Record<string, string>,
  body: unknown = {},
): TenantRequest {
  const lowerCased = Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]),
  );
  const lookup = (name: string) => lowerCased[name.toLowerCase()];
  return {
    headers: lowerCased,
    header: lookup,
    get: lookup,
    body,
  } as unknown as TenantRequest;
}

export function contextFor(
  controller: new () => object,
  handler: Handler,
  request: TenantRequest,
): ExecutionContext {
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

export async function rejectionOf(
  run: () => Promise<unknown>,
): Promise<HttpException> {
  try {
    await run();
  } catch (error) {
    if (error instanceof HttpException) {
      return error;
    }
    throw error;
  }
  throw new Error('expected an HttpException');
}
