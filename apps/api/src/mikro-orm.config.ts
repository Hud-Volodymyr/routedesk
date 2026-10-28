import { defineConfig } from "@mikro-orm/core";
import { Migrator } from "@mikro-orm/migrations";
import { SeedManager } from '@mikro-orm/seeder';
import { PostgreSqlDriver } from "@mikro-orm/postgresql";
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Tenant } from "./tenants/tenant.entity.js";
import { Store } from "./stores/store.entity.js";
import { Order } from "./orders/order.entity.js";
import { User } from "./users/user.entity.js";
import { Vehicle } from "./vehicles/vehicle.entity.js";
import { Driver } from "./drivers/driver.entity.js";
import { RouteJob } from "./route-jobs/route-job.entity.js";
import { Route } from "./routes/route.entity.js";
import { RouteStop } from "./routes/route-stop.entity.js";
import { Depot } from "./depots/depot.entity.js";
import { RouteJobUnassigned } from "./route-jobs/route-job-unassigned.entity.js";
import { Zone } from "./zones/zone.entity.js";

const envFile = resolve(import.meta.dirname, '../.env');
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

export default defineConfig({
  clientUrl: process.env.DATABASE_URL,
  driver: PostgreSqlDriver,
  entities: [
    Tenant, Store, Order, User, Vehicle, Driver, RouteJob, Route, RouteStop,
    Depot, RouteJobUnassigned, Zone
  ],
  extensions: [Migrator, SeedManager],
  migrations: {
    path: 'dist/migrations',
    pathTs: 'src/migrations',
    fileName: (timestamp: string, name?: string) => {
      if (!name) {
        throw new Error('Give the migration a name: orm migration:create --name=...');
      }
      return `Migration${timestamp}_${name}`;
    },
  },
  seeder: {
    path: 'dist/seeders',
    pathTs: 'src/seeders',
    defaultSeeder: 'DatabaseSeeder',
  },
});
