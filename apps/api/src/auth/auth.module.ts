import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AccessTokenVerifier } from './access-token-verifier.js';
import { CognitoGuard } from './cognito.guard.js';
import { RolesGuard } from './roles.guard.js';

@Module({
  providers: [
    AccessTokenVerifier,
    { provide: APP_GUARD, useClass: CognitoGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
