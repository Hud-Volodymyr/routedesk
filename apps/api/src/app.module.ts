import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module.js';
import config from './mikro-orm.config.js';

@Module({
  imports: [MikroOrmModule.forRoot(config), HealthModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
