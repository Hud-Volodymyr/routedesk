import type { GeoJsonPolygon } from '@routedesk/shared';
import type { Opt } from '@mikro-orm/core';
import { Entity, Index, ManyToOne, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';
import { PolygonType } from '../common/geo/geography.type.js';
import { Depot } from '../depots/depot.entity.js';
import { Tenant } from '../tenants/tenant.entity.js';

// Zones may overlap. A store covered by several zones belongs to the one with the
// highest priority; ties go to the oldest zone (createdAt, then id). See decision 013.
@Entity({ tableName: 'zones' })
@Index({ name: 'zones_area_gix', properties: ['area'], type: 'gist' })
@Index({ properties: ['tenant', 'depot'] })
export class Zone {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: Opt<string>;

  @ManyToOne(() => Tenant)
  tenant!: Tenant;

  @ManyToOne(() => Depot)
  depot!: Depot;

  @Property({ type: 'text' })
  name!: string;

  @Property({ type: PolygonType })
  area!: GeoJsonPolygon;

  @Property({ type: 'integer', default: 0 })
  priority!: Opt<number>;

  @Property({ type: 'datetime', columnType: 'timestamptz', defaultRaw: 'now()' })
  createdAt!: Opt<Date>;

  @Property({
    type: 'datetime',
    columnType: 'timestamptz',
    defaultRaw: 'now()',
    onUpdate: () => new Date(),
  })
  updatedAt!: Opt<Date>;
}
