
import type { Opt } from '@mikro-orm/core';
import { Entity, Index, ManyToOne, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';
import { Tenant } from '../tenants/tenant.entity.js';
import type { GeoJsonPoint } from '@routedesk/shared';
import { PointType } from '../common/geo/geography.type.js';
 
@Entity({ tableName: 'stores' })
@Index({ name: 'stores_location_gix', properties: ['location'], type: 'gist' })
export class Store {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: Opt<string>;
 
  @Property({ type: 'text' })
  name!: string;

  @Property({ type: 'text', nullable: true })
  address?: string;

  @Property({ type: PointType })
  location!: GeoJsonPoint;
 
  @Property({ type: 'datetime', columnType: 'timestamptz', defaultRaw: 'now()' })
  createdAt!: Opt<Date>;

  @Property({ type: 'datetime', columnType: 'timestamptz', defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt!: Opt<Date>;

  @ManyToOne(() => Tenant)
  tenant!: Tenant;
}
