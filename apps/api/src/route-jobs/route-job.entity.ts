import type { RouteJobStatus } from '@routedesk/shared';
import type { Opt } from '@mikro-orm/core';
import { Check, Entity, Index, ManyToOne, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';
import { Depot } from '../depots/depot.entity.js';
import { Tenant } from '../tenants/tenant.entity.js';
import { User } from '../users/user.entity.js';

// One request to plan routes for one depot and date: queued -> running -> done | failed
// Each depot is planned independently, so dispatchers of different depots never block each other
@Entity({ tableName: 'route_jobs' })
// Only a finished job can be the live plan.
@Check({ name: 'route_jobs_current_is_done', expression: `not is_current or status = 'done'` })
// At most one queued or running job per depot and date (two dispatchers clicking "plan" at once)
@Index({
  name: 'route_jobs_one_active_idx',
  expression: `create unique index "route_jobs_one_active_idx" on "route_jobs" ("tenant_id", "depot_id", "delivery_date") where status in ('queued', 'running')`,
})
// Exactly one current plan per depot and date
@Index({
  name: 'route_jobs_one_current_idx',
  expression: `create unique index "route_jobs_one_current_idx" on "route_jobs" ("tenant_id", "depot_id", "delivery_date") where is_current`,
})
export class RouteJob {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: Opt<string>;

  @ManyToOne(() => Tenant)
  tenant!: Tenant;

  @ManyToOne(() => Depot)
  depot!: Depot;

  @ManyToOne(() => User, { fieldName: 'requested_by' })
  requestedBy!: User;

  @Property({ type: 'date' })
  deliveryDate!: string;

  @Property({ type: 'text', default: 'queued' })
  status!: Opt<RouteJobStatus>;

  @Property({ type: 'text', nullable: true })
  error?: string | null;

  // How many times a worker picked the job up. More than 1 means an SQS retry
  @Property({ type: 'integer', default: 0 })
  attempts!: Opt<number>;

  // This job's routes are the live plan for its depot and date
  @Property({ type: 'boolean', default: false })
  isCurrent!: Opt<boolean>;

  @Property({ type: 'datetime', columnType: 'timestamptz', defaultRaw: 'now()' })
  createdAt!: Opt<Date>;

  @Property({ type: 'datetime', columnType: 'timestamptz', nullable: true })
  startedAt?: Date | null;

  @Property({ type: 'datetime', columnType: 'timestamptz', nullable: true })
  finishedAt?: Date | null;
}
