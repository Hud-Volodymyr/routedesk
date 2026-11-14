import { Injectable } from '@nestjs/common';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import type { Jwks } from 'aws-jwt-verify/jwk';
import type { CognitoAccessTokenPayload } from 'aws-jwt-verify/jwt-model';

@Injectable()
export class AccessTokenVerifier {
  private readonly verifier;

  constructor() {
    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    const clientIds = (process.env.COGNITO_CLIENT_IDS ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (!userPoolId || clientIds.length === 0) {
      throw new Error(
        'COGNITO_USER_POOL_ID and COGNITO_CLIENT_IDS must be set',
      );
    }

    this.verifier = CognitoJwtVerifier.create({
      userPoolId,
      tokenUse: 'access',
      clientId: clientIds,
    });
  }

  verify(token: string): Promise<CognitoAccessTokenPayload> {
    return this.verifier.verify(token);
  }

  cacheJwks(jwks: Jwks): void {
    this.verifier.cacheJwks(jwks);
  }
}
