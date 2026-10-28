import type { GeoJsonPoint } from '@routedesk/shared';
import type { Opt } from '@mikro-orm/core';
import { Entity, Index, ManyToOne, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';
import { PointType } from '../common/geo/geography.type.js';
import { Tenant } from '../tenants/tenant.entity.js';

// A warehouse vehicles start from, reload at and return to. Zones and vehicles belong to a depot.
@Entity({ tableName: 'depots' })
@Index({ name: 'depots_location_gix', properties: ['location'], type: 'gist' })
export class Depot {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: Opt<string>;

  @ManyToOne(() => Tenant)
  tenant!: Tenant;

  @Property({ type: 'text' })
  name!: string;

  @Property({ type: 'text', nullable: true })
  address?: string | null;

  @Property({ type: PointType })
  location!: GeoJsonPoint;

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
