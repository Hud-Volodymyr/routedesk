import type { UnassignedReason } from '@routedesk/shared';
import { PrimaryKeyProp } from '@mikro-orm/core';
import { Check, Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { Order } from '../orders/order.entity.js';
import { Tenant } from '../tenants/tenant.entity.js';
import { RouteJob } from './route-job.entity.js';

// An order a job could not place on any route, and why. The job still ends as 'done'
@Entity({ tableName: 'route_job_unassigned' })
@Check({
  name: 'route_job_unassigned_reason_check',
  expression: `reason in ('no_zone', 'no_vehicle', 'over_capacity')`,
})
export class RouteJobUnassigned {
  // Composite primary key: an order is listed at most once per job.
  [PrimaryKeyProp]?: ['job', 'order'];

  @ManyToOne(() => RouteJob, { primary: true, deleteRule: 'cascade' })
  job!: RouteJob;

  @ManyToOne(() => Order, { primary: true })
  order!: Order;

  @ManyToOne(() => Tenant)
  tenant!: Tenant;

  @Property({ type: 'text' })
  reason!: UnassignedReason;
}
