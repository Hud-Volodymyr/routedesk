import type { CognitoAccessTokenPayload } from 'aws-jwt-verify/jwt-model';

const PREFIX = 'fake.';

export function authHeader(
  tenantId: string,
  groups: string[] = ['dispatcher'],
): Record<string, string> {
  const payload = {
    sub: `test-user-${tenantId}`,
    token_use: 'access',
    tenant_id: tenantId,
    'cognito:groups': groups,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return { Authorization: `Bearer ${PREFIX}${encoded}` };
}

export class FakeAccessTokenVerifier {
  verify(token: string): Promise<CognitoAccessTokenPayload> {
    if (!token.startsWith(PREFIX)) {
      return Promise.reject(new Error('Not a test token'));
    }
    const json = Buffer.from(
      token.slice(PREFIX.length),
      'base64url',
    ).toString();
    return Promise.resolve(JSON.parse(json) as CognitoAccessTokenPayload);
  }
}
