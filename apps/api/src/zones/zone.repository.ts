import { EntityRepository } from '@mikro-orm/postgresql';
import type { GeoJsonPoint } from '@routedesk/shared';
import type { DB } from '../common/db/db.generated.js';
import { covers, point } from '../common/geo/postgis.js';
import type { StoreZone } from '../stores/dto/store-responses.js';
import type { Zone } from './zone.entity.js';

export class ZoneRepository extends EntityRepository<Zone> {
  findCovering(
    tenantId: string,
    location: GeoJsonPoint,
  ): Promise<StoreZone | undefined> {
    const [lng, lat] = location.coordinates;
    const target = point(lng, lat);

    return this.em
      .getKysely<DB>()
      .selectFrom('zones')
      .select(['id', 'name', 'priority', 'depot_id as depotId'])
      .where('tenant_id', '=', tenantId)
      .where((eb) => covers(eb.ref('area'), target))
      .orderBy('priority', 'desc')
      .orderBy('created_at')
      .orderBy('id')
      .limit(1)
      .executeTakeFirst();
  }
}
