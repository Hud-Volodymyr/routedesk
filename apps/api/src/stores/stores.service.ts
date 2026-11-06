import { Injectable } from '@nestjs/common';
import type { GeoJsonPoint } from '@routedesk/shared';
import type { StoreWithDistance, StoreZone } from './dto/store-responses.js';
import { DepotRepository } from '../depots/depot.repository.js';
import { ZoneRepository } from '../zones/zone.repository.js';
import { StoreRepository } from './store.repository.js';

@Injectable()
export class StoresService {
  constructor(
    private readonly stores: StoreRepository,
    private readonly depots: DepotRepository,
    private readonly zones: ZoneRepository,
  ) {}

  findWithin(
    tenantId: string,
    centerpoint: GeoJsonPoint,
    radiusM: number,
  ): Promise<StoreWithDistance[]> {
    return this.stores.findWithin(tenantId, centerpoint, radiusM);
  }

  async findNearestToDepot(
    tenantId: string,
    depotId: string,
    k: number,
  ): Promise<StoreWithDistance[]> {
    const depot = await this.depots.findOneOrFail({
      id: depotId,
      tenant: tenantId,
    });

    return this.stores.findNearestToLocation(tenantId, depot.location, k);
  }

  async findZone(tenantId: string, storeId: string): Promise<StoreZone | null> {
    const store = await this.stores.findOneOrFail({
      id: storeId,
      tenant: tenantId,
    });

    return (await this.zones.findCovering(tenantId, store.location)) ?? null;
  }
}
