import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AccessTokenVerifier } from './access-token-verifier.js';
import { CognitoGuard } from './cognito.guard.js';

@Module({
  providers: [
    AccessTokenVerifier,
    { provide: APP_GUARD, useClass: CognitoGuard },
  ],
})
export class AuthModule {}
