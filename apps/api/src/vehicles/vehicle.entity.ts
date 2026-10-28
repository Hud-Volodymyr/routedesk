import type { Opt } from '@mikro-orm/core';
import { Check, Entity, Index, ManyToOne, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';
import { Depot } from '../depots/depot.entity.js';
import { Driver } from '../drivers/driver.entity.js';
import { Tenant } from '../tenants/tenant.entity.js';

@Entity({ tableName: 'vehicles' })
@Index({ properties: ['tenant', 'depot'] })
@Check({ name: 'vehicles_capacity_check', expression: 'capacity > 0' })
@Check({ name: 'vehicles_max_trips_check', expression: 'max_trips >= 1' })
export class Vehicle {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: Opt<string>;

  @ManyToOne(() => Tenant)
  tenant!: Tenant;

  // The depot the vehicle starts and ends its routes at
  @ManyToOne(() => Depot)
  depot!: Depot;

  // The currently assigned driver, if any
  @ManyToOne(() => Driver, { nullable: true, fieldName: 'driver_id' })
  driver?: Driver | null;

  @Property({ type: 'text' })
  name!: string;

  // Same unit as Order.size
  @Property({ type: 'integer' })
  capacity!: number;

  // How many times per day the vehicle may return to the depot to reload
  // 1 means a single trip. Without a limit, one vehicle could take every order by reloading
  @Property({ type: 'integer', default: 1 })
  maxTrips!: Opt<number>;

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
