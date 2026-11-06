import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TenantHeaderGuard } from './tenant-header.guard.js';

@Module({
  providers: [{ provide: APP_GUARD, useClass: TenantHeaderGuard }],
})
export class AuthModule {}
