import type { GeoJsonLineString } from '@routedesk/shared';
import type { Opt } from '@mikro-orm/core';
import {
  Check,
  Entity,
  Index,
  ManyToOne,
  PrimaryKey,
  Property,
  Unique,
} from '@mikro-orm/decorators/legacy';
import { LineStringType } from '../common/geo/geography.type.js';
import { Driver } from '../drivers/driver.entity.js';
import { RouteJob } from '../route-jobs/route-job.entity.js';
import { Tenant } from '../tenants/tenant.entity.js';
import { Vehicle } from '../vehicles/vehicle.entity.js';
import { Zone } from '../zones/zone.entity.js';

// One vehicle's day for one job: one or more trips, each starting and ending at the depot.
// Routes never change after the worker writes them.
@Entity({ tableName: 'routes' })
@Unique({ properties: ['job', 'vehicle'] })
@Index({ properties: ['tenant', 'driver', 'deliveryDate'] })
@Check({ name: 'routes_total_distance_check', expression: 'total_distance_m >= 0' })
export class Route {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: Opt<string>;

  @ManyToOne(() => Tenant)
  tenant!: Tenant;

  @ManyToOne(() => RouteJob, { deleteRule: 'cascade' })
  job!: RouteJob;

  @ManyToOne(() => Vehicle)
  vehicle!: Vehicle;

  @ManyToOne(() => Zone)
  zone!: Zone;

  @ManyToOne(() => Driver, { nullable: true, fieldName: 'driver_id' })
  driver?: Driver | null;

  @Property({ type: 'date' })
  deliveryDate!: string;

  // The whole day: depot -> stops of trip 1 -> depot -> stops of trip 2 -> ... -> depot.
  @Property({ type: LineStringType })
  path!: GeoJsonLineString;

  // Includes the legs back to the depot between trips and at the end of the day.
  @Property({ type: 'double', columnType: 'double precision' })
  totalDistanceM!: number;

  @Property({ type: 'datetime', columnType: 'timestamptz', defaultRaw: 'now()' })
  createdAt!: Opt<Date>;
}
