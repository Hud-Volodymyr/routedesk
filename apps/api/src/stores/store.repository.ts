import { EntityRepository } from '@mikro-orm/postgresql';
import type { Store } from './store.entity.js';
import type { GeoJsonPoint } from '@routedesk/shared';
import {
  asGeoJson,
  distance,
  dWithin,
  nearest,
  point,
} from '../common/geo/postgis.js';
import type { DB } from '../common/db/db.generated.js';
import type { StoreWithDistance } from './dto/store-responses.js';

export class StoreRepository extends EntityRepository<Store> {
  findWithin(
    tenantId: string,
    centerpoint: GeoJsonPoint,
    radiusM: number,
  ): Promise<StoreWithDistance[]> {
    const [lng, lat] = centerpoint.coordinates;
    const target = point(lng, lat);
    return this.em
      .getKysely<DB>()
      .selectFrom('stores')
      .select((eb) => [
        'id',
        'name',
        asGeoJson<GeoJsonPoint>(eb.ref('location')).as('location'),
        distance(eb.ref('location'), target).as('distanceM'),
      ])
      .where('tenant_id', '=', tenantId)
      .where((eb) => dWithin(eb.ref('location'), target, radiusM))
      .orderBy('distanceM')
      .execute();
  }

  findNearestToLocation(
    tenantId: string,
    location: GeoJsonPoint,
    k: number,
  ): Promise<StoreWithDistance[]> {
    const [lng, lat] = location.coordinates;
    const locationPoint = point(lng, lat);

    return this.em
      .getKysely<DB>()
      .selectFrom('stores')
      .select((eb) => [
        'id',
        'name',
        asGeoJson<GeoJsonPoint>(eb.ref('location')).as('location'),
        distance(eb.ref('location'), locationPoint).as('distanceM'),
      ])
      .where('tenant_id', '=', tenantId)
      .orderBy((eb) => nearest(eb.ref('location'), locationPoint))
      .limit(k)
      .execute();
  }
}
