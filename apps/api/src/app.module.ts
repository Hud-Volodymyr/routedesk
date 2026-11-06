import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AuthModule } from './auth/auth.module.js';
import { NotFoundErrorFilter } from './common/errors/not-found-error.filter.js';
import { HealthModule } from './health/health.module.js';
import config from './mikro-orm.config.js';
import { StoresModule } from './stores/stores.module.js';

@Module({
  imports: [
    MikroOrmModule.forRoot(config),
    AuthModule,
    HealthModule,
    StoresModule,
  ],
  controllers: [],
  providers: [{ provide: APP_FILTER, useClass: NotFoundErrorFilter }],
})
export class AppModule {}
