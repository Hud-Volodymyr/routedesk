import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { HealthModule } from './health/health.module.js';
import config from './mikro-orm.config.js';

@Module({
  imports: [MikroOrmModule.forRoot(config), AuthModule, HealthModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
