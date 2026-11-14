# Row-level security

The database itself keeps tenants apart: queries made as the app's role see and write only the current transaction's tenant. Decisions 050, 052–054.

## Requirements

- **RLS-1** As the app role, every query on a tenant-owned table, and on `tenants`, sees and writes only rows of the tenant set in the current transaction. With no tenant set, it sees no rows and can't write any.
- **RLS-2** The app role can't bypass row-level security: it is not a superuser, does not own the tables and lacks `bypassrls`. It can select, insert, update and delete on the tenant-owned tables and `tenants`, and on nothing else in the `public` schema except reading `spatial_ref_sys`, which PostGIS grants to everyone.
- **RLS-3** When an authenticated request's code starts a transaction (a `@Transactional()` method or a `flush()`), the tenant set in it is the request's tenant. The setting does not outlive the transaction.

## Entry points

```
apps/api/src/migrations/          // creates routedesk_app (no password), grants and policies
apps/api/scripts/app-role.ts      // setAppRolePassword(em, password): sets the local and test password
APP_DB_PASSWORD                   // routedesk_app's local and test password
DATABASE_URL                      // the API connects as routedesk_app
DATABASE_OWNER_URL                // used when DB_ROLE=owner: migrations and the seeder

// apps/api/src/
tenantContext                     // AsyncLocalStorage<string> holding the request's tenant (src/common/db/tenant-context.ts)
TenantContextInterceptor          // global interceptor; runs the handler inside tenantContext with the request's tenant
TenantTransactionSubscriber       // MikroORM subscriber; afterTransactionStart sets app.tenant_id
@Transactional()                  // from @mikro-orm/decorators/legacy, on service methods that touch the database
```

## Fixture facts

- Tenant-owned tables (with `tenant_id`): `depots`, `drivers`, `orders`, `route_jobs`, `route_job_unassigned`, `routes`, `route_stops`, `stores`, `users`, `vehicles`, `zones`. `tenants` is keyed on `id`.
- The tenant setting is `app.tenant_id`, read by policies as `nullif(current_setting('app.tenant_id', true), '')::uuid`.
- `startTestDatabase()` returns `orm`, connected as `routedesk_app` with `APP_DB_PASSWORD`, and `ownerOrm`, connected as the container's owner, which ran the migrations and the seeder and sees every tenant.
- `inTenant(orm, tenantId, work)` from `apps/api/test/helpers/test-database.ts` runs `work(em)` in a transaction with `tenantId` set, as a request's code would. Seed data looked up for test setup comes from `ownerOrm`.
- The seed has two tenants, Kyiv Distribution and Lviv Supply, each with stores, depots, zones and users.
