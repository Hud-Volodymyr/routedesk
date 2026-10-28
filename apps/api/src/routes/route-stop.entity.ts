import { PrimaryKeyProp } from '@mikro-orm/core';
import {
  Check,
  Entity,
  Index,
  ManyToOne,
  PrimaryKey,
  Property,
  Unique,
} from '@mikro-orm/decorators/legacy';
import { Order } from '../orders/order.entity.js';
import { Tenant } from '../tenants/tenant.entity.js';
import { Route } from './route.entity.js';

// One stop on a route. seq is the visiting order across the whole day, starting at 1
// trip says which load the stop belongs to; a new trip starts after a reload at the depot
@Entity({ tableName: 'route_stops' })
@Unique({ properties: ['route', 'order'] })
@Index({ properties: ['tenant', 'order'] })
@Check({ name: 'route_stops_seq_check', expression: 'seq >= 1' })
@Check({ name: 'route_stops_trip_check', expression: 'trip >= 1' })
@Check({ name: 'route_stops_distance_check', expression: 'distance_from_prev_m >= 0' })
export class RouteStop {
  // Composite primary key: a route can't have two stops with the same position
  [PrimaryKeyProp]?: ['route', 'seq'];

  @ManyToOne(() => Route, { primary: true, deleteRule: 'cascade' })
  route!: Route;

  @PrimaryKey({ type: 'integer' })
  seq!: number;

  // 1 for the first load, 2 after the first reload, and so on
  @Property({ type: 'integer' })
  trip!: number;

  @ManyToOne(() => Tenant)
  tenant!: Tenant;

  @ManyToOne(() => Order)
  order!: Order;

  // From the previous stop, or from the depot for the first stop of each trip.
  @Property({ type: 'double', columnType: 'double precision' })
  distanceFromPrevM!: number;
}
