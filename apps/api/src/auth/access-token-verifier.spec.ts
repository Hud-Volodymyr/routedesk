import { createSign, generateKeyPairSync } from 'node:crypto';
import type { Jwks } from 'aws-jwt-verify/jwk';
import { AccessTokenVerifier } from './access-token-verifier.js';

const POOL_ID = 'eu-central-1_TestPool1';
const KID = 'test-key-1';

const signingKeys = generateKeyPairSync('rsa', { modulusLength: 2048 });

const jwks = {
  keys: [
    {
      ...signingKeys.publicKey.export({ format: 'jwk' }),
      kid: KID,
      alg: 'RS256',
      use: 'sig',
    },
  ],
} as unknown as Jwks;

function base64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function sign(claims: Record<string, unknown>): string {
  const signingInput = `${base64url({ alg: 'RS256', kid: KID, typ: 'JWT' })}.${base64url(claims)}`;
  const signature = createSign('RSA-SHA256')
    .update(signingInput)
    .sign(signingKeys.privateKey)
    .toString('base64url');
  return `${signingInput}.${signature}`;
}

function accessClaims(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: `https://cognito-idp.eu-central-1.amazonaws.com/${POOL_ID}`,
    token_use: 'access',
    client_id: 'client-a',
    sub: 'user-123',
    iat: now - 60,
    exp: now + 3600,
    ...overrides,
  };
}

function createVerifier(clientIds: string): AccessTokenVerifier {
  vi.stubEnv('COGNITO_USER_POOL_ID', POOL_ID);
  vi.stubEnv('COGNITO_CLIENT_IDS', clientIds);
  const verifier = new AccessTokenVerifier();
  verifier.cacheJwks(jwks);
  return verifier;
}

describe('AccessTokenVerifier', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    ['COGNITO_USER_POOL_ID is missing', undefined, 'client-a'],
    ['COGNITO_CLIENT_IDS is missing', POOL_ID, undefined],
    ['COGNITO_CLIENT_IDS has no non-empty entry', POOL_ID, ' , ,'],
  ])(
    'TENANT-4: fails to create when %s, naming both variables',
    (_label, poolId, clientIds) => {
      vi.stubEnv('COGNITO_USER_POOL_ID', poolId);
      vi.stubEnv('COGNITO_CLIENT_IDS', clientIds);

      expect(() => new AccessTokenVerifier()).toThrow(
        expect.objectContaining({
          message: expect.stringMatching(
            /COGNITO_USER_POOL_ID[\s\S]*COGNITO_CLIENT_IDS|COGNITO_CLIENT_IDS[\s\S]*COGNITO_USER_POOL_ID/,
          ),
        }),
      );
    },
  );

  it('TENANT-4: accepts access tokens from the pool for each listed client, spaces trimmed and empty entries skipped', async () => {
    const verifier = createVerifier(' client-a , ,client-b ,');

    await expect(
      verifier.verify(sign(accessClaims({ client_id: 'client-a' }))),
    ).resolves.toMatchObject({
      client_id: 'client-a',
    });
    await expect(
      verifier.verify(sign(accessClaims({ client_id: 'client-b' }))),
    ).resolves.toMatchObject({
      client_id: 'client-b',
    });
  });

  it('TENANT-4: rejects a token for an unlisted client', async () => {
    const verifier = createVerifier('client-a, client-b');

    await expect(
      verifier.verify(sign(accessClaims({ client_id: 'client-c' }))),
    ).rejects.toThrow();
  });

  it('TENANT-4: rejects an ID token for a listed client', async () => {
    const verifier = createVerifier('client-a');
    const { client_id: _clientId, ...rest } = accessClaims();

    await expect(
      verifier.verify(sign({ ...rest, token_use: 'id', aud: 'client-a' })),
    ).rejects.toThrow();
  });
});
