import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { Depot } from '../depots/depot.entity.js';
import { Zone } from '../zones/zone.entity.js';
import { Store } from './store.entity.js';
import { StoresController } from './stores.controller.js';
import { StoresService } from './stores.service.js';

@Module({
  imports: [MikroOrmModule.forFeature([Store, Depot, Zone])],
  controllers: [StoresController],
  providers: [StoresService],
})
export class StoresModule {}
