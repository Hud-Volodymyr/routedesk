import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AccessTokenVerifier } from './access-token-verifier.js';
import { CognitoGuard } from './cognito.guard.js';
import { RolesGuard } from './roles.guard.js';
import { TenantContextInterceptor } from './tenant-context.interceptor.js';

@Module({
  providers: [
    AccessTokenVerifier,
    { provide: APP_GUARD, useClass: CognitoGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
  ],
})
export class AuthModule {}
