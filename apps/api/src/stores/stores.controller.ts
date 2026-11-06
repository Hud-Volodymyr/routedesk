import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { TenantId } from '../auth/tenant-id.decorator.js';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe.js';
import {
  nearestStoresQuery,
  type NearestStoresQuery,
} from './dto/nearest-stores.query.js';
import type {
  StoreWithDistance,
  StoreZoneResponse,
} from './dto/store-responses.js';
import {
  storesWithinQuery,
  type StoresWithinQuery,
} from './dto/stores-within.query.js';
import { StoresService } from './stores.service.js';

@Controller('stores')
export class StoresController {
  constructor(private readonly stores: StoresService) {}

  @Get('within')
  within(
    @TenantId() tenantId: string,
    @Query(new ZodValidationPipe(storesWithinQuery)) query: StoresWithinQuery,
  ): Promise<StoreWithDistance[]> {
    return this.stores.findWithin(
      tenantId,
      { type: 'Point', coordinates: [query.lng, query.lat] },
      query.radiusKm * 1000,
    );
  }

  @Get('nearest')
  nearest(
    @TenantId() tenantId: string,
    @Query(new ZodValidationPipe(nearestStoresQuery)) query: NearestStoresQuery,
  ): Promise<StoreWithDistance[]> {
    return this.stores.findNearestToDepot(tenantId, query.depotId, query.k);
  }

  @Get(':id/zone')
  async zone(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StoreZoneResponse> {
    return { zone: await this.stores.findZone(tenantId, id) };
  }
}
