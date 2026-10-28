import { defineConfig } from "@mikro-orm/core";
import { Migrator } from "@mikro-orm/migrations";
import { PostgreSqlDriver } from "@mikro-orm/postgresql";
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Tenant } from "./tenants/tenant.entity.js";
import { Store } from "./stores/store.entity.js";
import { Order } from "./orders/order.entity.js";

const envFile = resolve(import.meta.dirname, '../.env');
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

export default defineConfig({
  clientUrl: process.env.DATABASE_URL,
  driver: PostgreSqlDriver,
  entities: [Tenant, Store, Order],
  extensions: [Migrator],
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
});
