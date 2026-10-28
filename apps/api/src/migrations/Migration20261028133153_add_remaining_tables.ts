import { Migration } from '@mikro-orm/migrations';

export class Migration20261028133153_add_remaining_tables extends Migration {

  override name = 'Migration20261028133153_add_remaining_tables';

  override up(): void | Promise<void> {
    this.addSql(`create table "depots" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "name" text not null, "address" text null, "location" geography(Point, 4326) not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), primary key ("id"));`);
    this.addSql(`create index "depots_location_gix" on "depots" using gist ("location");`);

    this.addSql(`create table "users" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "cognito_sub" text not null, "email" text not null, "name" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), primary key ("id"));`);
    this.addSql(`alter table "users" add constraint "users_cognito_sub_unique" unique ("cognito_sub");`);

    this.addSql(`create table "route_jobs" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "depot_id" uuid not null, "requested_by" uuid not null, "delivery_date" date not null, "status" text not null default 'queued', "error" text null, "attempts" int not null default 0, "is_current" boolean not null default false, "created_at" timestamptz not null default now(), "started_at" timestamptz null, "finished_at" timestamptz null, primary key ("id"));`);
    this.addSql(`create unique index "route_jobs_one_current_idx" on "route_jobs" ("tenant_id", "depot_id", "delivery_date") where is_current;`);
    this.addSql(`create unique index "route_jobs_one_active_idx" on "route_jobs" ("tenant_id", "depot_id", "delivery_date") where status in ('queued', 'running');`);

    this.addSql(`create table "route_job_unassigned" ("job_id" uuid not null, "order_id" uuid not null, "tenant_id" uuid not null, "reason" text not null, primary key ("job_id", "order_id"));`);

    this.addSql(`create table "drivers" ("user_id" uuid not null, "tenant_id" uuid not null, "phone" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), primary key ("user_id"));`);

    this.addSql(`create table "vehicles" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "depot_id" uuid not null, "driver_id" uuid null, "name" text not null, "capacity" int not null, "max_trips" int not null default 1, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), primary key ("id"));`);
    this.addSql(`create index "vehicles_tenant_id_depot_id_index" on "vehicles" ("tenant_id", "depot_id");`);

    this.addSql(`create table "zones" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "depot_id" uuid not null, "name" text not null, "area" geography(Polygon, 4326) not null, "priority" int not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), primary key ("id"));`);
    this.addSql(`create index "zones_tenant_id_depot_id_index" on "zones" ("tenant_id", "depot_id");`);
    this.addSql(`create index "zones_area_gix" on "zones" using gist ("area");`);

    this.addSql(`create table "routes" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "job_id" uuid not null, "vehicle_id" uuid not null, "zone_id" uuid not null, "driver_id" uuid null, "delivery_date" date not null, "path" geography(LineString, 4326) not null, "total_distance_m" double precision not null, "created_at" timestamptz not null default now(), primary key ("id"));`);
    this.addSql(`create index "routes_tenant_id_driver_id_delivery_date_index" on "routes" ("tenant_id", "driver_id", "delivery_date");`);
    this.addSql(`alter table "routes" add constraint "routes_job_id_vehicle_id_unique" unique ("job_id", "vehicle_id");`);

    this.addSql(`create table "route_stops" ("route_id" uuid not null, "seq" int not null, "trip" int not null, "tenant_id" uuid not null, "order_id" uuid not null, "distance_from_prev_m" double precision not null, primary key ("route_id", "seq"));`);
    this.addSql(`create index "route_stops_tenant_id_order_id_index" on "route_stops" ("tenant_id", "order_id");`);
    this.addSql(`alter table "route_stops" add constraint "route_stops_route_id_order_id_unique" unique ("route_id", "order_id");`);

    this.addSql(`alter table "depots" add constraint "depots_tenant_id_foreign" foreign key ("tenant_id") references "tenants" ("id");`);

    this.addSql(`alter table "users" add constraint "users_tenant_id_foreign" foreign key ("tenant_id") references "tenants" ("id");`);

    this.addSql(`alter table "route_jobs" add constraint "route_jobs_tenant_id_foreign" foreign key ("tenant_id") references "tenants" ("id");`);
    this.addSql(`alter table "route_jobs" add constraint "route_jobs_depot_id_foreign" foreign key ("depot_id") references "depots" ("id");`);
    this.addSql(`alter table "route_jobs" add constraint "route_jobs_requested_by_foreign" foreign key ("requested_by") references "users" ("id");`);
    this.addSql(`alter table "route_jobs" add constraint "route_jobs_current_is_done" check (not is_current or status = 'done');`);

    this.addSql(`alter table "route_job_unassigned" add constraint "route_job_unassigned_job_id_foreign" foreign key ("job_id") references "route_jobs" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "route_job_unassigned" add constraint "route_job_unassigned_order_id_foreign" foreign key ("order_id") references "orders" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "route_job_unassigned" add constraint "route_job_unassigned_tenant_id_foreign" foreign key ("tenant_id") references "tenants" ("id");`);
    this.addSql(`alter table "route_job_unassigned" add constraint "route_job_unassigned_reason_check" check (reason in ('no_zone', 'no_vehicle', 'over_capacity'));`);

    this.addSql(`alter table "drivers" add constraint "drivers_user_id_foreign" foreign key ("user_id") references "users" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "drivers" add constraint "drivers_tenant_id_foreign" foreign key ("tenant_id") references "tenants" ("id");`);

    this.addSql(`alter table "vehicles" add constraint "vehicles_tenant_id_foreign" foreign key ("tenant_id") references "tenants" ("id");`);
    this.addSql(`alter table "vehicles" add constraint "vehicles_depot_id_foreign" foreign key ("depot_id") references "depots" ("id");`);
    this.addSql(`alter table "vehicles" add constraint "vehicles_driver_id_foreign" foreign key ("driver_id") references "drivers" ("user_id") on delete set null;`);
    this.addSql(`alter table "vehicles" add constraint "vehicles_max_trips_check" check (max_trips >= 1);`);
    this.addSql(`alter table "vehicles" add constraint "vehicles_capacity_check" check (capacity > 0);`);

    this.addSql(`alter table "zones" add constraint "zones_tenant_id_foreign" foreign key ("tenant_id") references "tenants" ("id");`);
    this.addSql(`alter table "zones" add constraint "zones_depot_id_foreign" foreign key ("depot_id") references "depots" ("id");`);

    this.addSql(`alter table "routes" add constraint "routes_tenant_id_foreign" foreign key ("tenant_id") references "tenants" ("id");`);
    this.addSql(`alter table "routes" add constraint "routes_job_id_foreign" foreign key ("job_id") references "route_jobs" ("id") on delete cascade;`);
    this.addSql(`alter table "routes" add constraint "routes_vehicle_id_foreign" foreign key ("vehicle_id") references "vehicles" ("id");`);
    this.addSql(`alter table "routes" add constraint "routes_zone_id_foreign" foreign key ("zone_id") references "zones" ("id");`);
    this.addSql(`alter table "routes" add constraint "routes_driver_id_foreign" foreign key ("driver_id") references "drivers" ("user_id") on delete set null;`);
    this.addSql(`alter table "routes" add constraint "routes_total_distance_check" check (total_distance_m >= 0);`);

    this.addSql(`alter table "route_stops" add constraint "route_stops_route_id_foreign" foreign key ("route_id") references "routes" ("id") on delete cascade;`);
    this.addSql(`alter table "route_stops" add constraint "route_stops_tenant_id_foreign" foreign key ("tenant_id") references "tenants" ("id");`);
    this.addSql(`alter table "route_stops" add constraint "route_stops_order_id_foreign" foreign key ("order_id") references "orders" ("id");`);
    this.addSql(`alter table "route_stops" add constraint "route_stops_distance_check" check (distance_from_prev_m >= 0);`);
    this.addSql(`alter table "route_stops" add constraint "route_stops_trip_check" check (trip >= 1);`);
    this.addSql(`alter table "route_stops" add constraint "route_stops_seq_check" check (seq >= 1);`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "route_jobs" drop constraint "route_jobs_depot_id_foreign";`);
    this.addSql(`alter table "vehicles" drop constraint "vehicles_depot_id_foreign";`);
    this.addSql(`alter table "zones" drop constraint "zones_depot_id_foreign";`);
    this.addSql(`alter table "route_jobs" drop constraint "route_jobs_requested_by_foreign";`);
    this.addSql(`alter table "drivers" drop constraint "drivers_user_id_foreign";`);
    this.addSql(`alter table "route_job_unassigned" drop constraint "route_job_unassigned_job_id_foreign";`);
    this.addSql(`alter table "routes" drop constraint "routes_job_id_foreign";`);
    this.addSql(`alter table "vehicles" drop constraint "vehicles_driver_id_foreign";`);
    this.addSql(`alter table "routes" drop constraint "routes_driver_id_foreign";`);
    this.addSql(`alter table "routes" drop constraint "routes_vehicle_id_foreign";`);
    this.addSql(`alter table "routes" drop constraint "routes_zone_id_foreign";`);
    this.addSql(`alter table "route_stops" drop constraint "route_stops_route_id_foreign";`);

    this.addSql(`drop table if exists "depots" cascade;`);
    this.addSql(`drop table if exists "users" cascade;`);
    this.addSql(`drop table if exists "route_jobs" cascade;`);
    this.addSql(`drop table if exists "route_job_unassigned" cascade;`);
    this.addSql(`drop table if exists "drivers" cascade;`);
    this.addSql(`drop table if exists "vehicles" cascade;`);
    this.addSql(`drop table if exists "zones" cascade;`);
    this.addSql(`drop table if exists "routes" cascade;`);
    this.addSql(`drop table if exists "route_stops" cascade;`);
  }

}
