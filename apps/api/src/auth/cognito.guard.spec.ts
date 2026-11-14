import { Reflector } from '@nestjs/core';
import type { AccessTokenVerifier } from './access-token-verifier.js';
import { CognitoGuard } from './cognito.guard.js';
import { Public } from './public.decorator.js';
import {
  contextFor,
  rejectionOf,
  requestWith,
} from '../../test/helpers/guard-context.js';

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
}

const TENANT = '3f2b8c1e-9a4d-4e7b-8c6f-1d2e3f4a5b6c';
const OTHER_TENANT = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const TOKEN = 'header.payload.signature';
const BEARER = { Authorization: `Bearer ${TOKEN}` };

type Claims = Record<string, unknown>;

function payload(overrides: Claims = {}): Claims {
  return {
    sub: 'user-123',
    token_use: 'access',
    client_id: 'client-a',
    tenant_id: TENANT,
    'cognito:groups': ['dispatchers'],
    ...overrides,
  };
}

function without(claim: string): Claims {
  const { [claim]: _removed, ...rest } = payload();
  return rest;
}

function guardWith(result: Claims | Error) {
  const verify = vi.fn((token: string) => {
    void token;
    return result instanceof Error
      ? Promise.reject(result)
      : Promise.resolve(result);
  });
  const verifier = { verify } as unknown as AccessTokenVerifier;
  return { verify, guard: new CognitoGuard(new Reflector(), verifier) };
}

const protectedHandle = ProtectedController.prototype.handle;

const rejected: [string, Record<string, string>, Claims | Error][] = [
  ['no Authorization header', {}, payload()],
  ['another scheme', { Authorization: `Basic ${TOKEN}` }, payload()],
  ['Bearer with an empty token', { Authorization: 'Bearer ' }, payload()],
  ['a token the verifier rejects', BEARER, new Error('Token expired')],
  ['no tenant_id', BEARER, without('tenant_id')],
  ['a numeric tenant_id', BEARER, payload({ tenant_id: 42 })],
  [
    'a tenant_id with a trailing character',
    BEARER,
    payload({ tenant_id: `${TENANT}0` }),
  ],
  [
    'a tenant_id with a leading character',
    BEARER,
    payload({ tenant_id: `x${TENANT}` }),
  ],
  ['no cognito:groups', BEARER, without('cognito:groups')],
  ['an empty cognito:groups', BEARER, payload({ 'cognito:groups': [] })],
  ['a string cognito:groups', BEARER, payload({ 'cognito:groups': 'admins' })],
  [
    'a cognito:groups with a non-string',
    BEARER,
    payload({ 'cognito:groups': ['admins', 42] }),
  ],
];

function rejectionFor(headers: Record<string, string>, result: Claims | Error) {
  const { guard } = guardWith(result);
  return rejectionOf(() =>
    guard.canActivate(
      contextFor(ProtectedController, protectedHandle, requestWith(headers)),
    ),
  );
}

describe('CognitoGuard', () => {
  it('TENANT-1: lets a handler of a @Public() controller through without calling the verifier', async () => {
    const { verify, guard } = guardWith(new Error('no token'));
    const context = contextFor(
      PublicController,
      PublicController.prototype.handle,
      requestWith({}),
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verify).not.toHaveBeenCalled();
  });

  it('TENANT-1: lets a @Public() handler through without a token', async () => {
    const { guard } = guardWith(new Error('no token'));
    const context = contextFor(
      MixedController,
      MixedController.prototype.open,
      requestWith({}),
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it.each(['Bearer', 'bEaReR'])(
    'TENANT-1: accepts the %s scheme and passes only the token to the verifier',
    async (scheme) => {
      const { verify, guard } = guardWith(payload());
      const context = contextFor(
        ProtectedController,
        protectedHandle,
        requestWith({ Authorization: `${scheme} ${TOKEN}` }),
      );

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(verify).toHaveBeenCalledWith(TOKEN);
    },
  );

  it.each(rejected)(
    'TENANT-1: rejects %s with 401',
    async (_label, headers, result) => {
      expect((await rejectionFor(headers, result)).getStatus()).toBe(401);
    },
  );

  it('TENANT-1: gives every 401 the same response', async () => {
    const responses = await Promise.all(
      rejected.map(async ([, headers, result]) =>
        (await rejectionFor(headers, result)).getResponse(),
      ),
    );

    for (const response of responses) {
      expect(response).toEqual(responses[0]);
    }
  });

  it('TENANT-2: takes the tenant from tenant_id in lower case, not from the body or other headers', async () => {
    const { guard } = guardWith(payload({ tenant_id: TENANT.toUpperCase() }));
    const request = requestWith(
      { ...BEARER, 'X-Tenant-Id': OTHER_TENANT },
      { tenantId: OTHER_TENANT, tenant_id: OTHER_TENANT },
    );

    await expect(
      guard.canActivate(
        contextFor(ProtectedController, protectedHandle, request),
      ),
    ).resolves.toBe(true);
    expect(request.tenantId).toBe(TENANT);
  });

  it('TENANT-2: sets the user from sub and cognito:groups', async () => {
    const { guard } = guardWith(
      payload({ sub: 'user-456', 'cognito:groups': ['dispatchers', 'admins'] }),
    );
    const request = requestWith(BEARER);

    await guard.canActivate(
      contextFor(ProtectedController, protectedHandle, request),
    );

    expect(request.user).toEqual({
      sub: 'user-456',
      groups: ['dispatchers', 'admins'],
    });
  });
});
