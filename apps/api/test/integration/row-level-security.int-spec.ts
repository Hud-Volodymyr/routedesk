import { randomUUID } from 'node:crypto';
import { RequestContext } from '@mikro-orm/core';
import { Transactional } from '@mikro-orm/decorators/legacy';
import { EntityManager } from '@mikro-orm/postgresql';
import { Test } from '@nestjs/testing';
import type { GeoJsonPoint } from '@routedesk/shared';
import { defer, lastValueFrom, type Observable } from 'rxjs';
import { TenantContextInterceptor } from '../../src/auth/tenant-context.interceptor.js';
import type { DB } from '../../src/common/db/db.generated.js';
import { Depot } from '../../src/depots/depot.entity.js';
import { Driver } from '../../src/drivers/driver.entity.js';
import { Order } from '../../src/orders/order.entity.js';
import { RouteJobUnassigned } from '../../src/route-jobs/route-job-unassigned.entity.js';
import { RouteJob } from '../../src/route-jobs/route-job.entity.js';
import { RouteStop } from '../../src/routes/route-stop.entity.js';
import { Route } from '../../src/routes/route.entity.js';
import { Store } from '../../src/stores/store.entity.js';
import { Tenant } from '../../src/tenants/tenant.entity.js';
import { User } from '../../src/users/user.entity.js';
import { Vehicle } from '../../src/vehicles/vehicle.entity.js';
import { Zone } from '../../src/zones/zone.entity.js';
import { contextFor, requestWith } from '../helpers/guard-context.js';
import {
  inTenant,
  startTestDatabase,
  type TestDatabase,
} from '../helpers/test-database.js';

const APP_ROLE = 'routedesk_app';

const TENANT_OWNED = [
  'depots',
  'drivers',
  'orders',
  'route_jobs',
  'route_job_unassigned',
  'routes',
  'route_stops',
  'stores',
  'users',
  'vehicles',
  'zones',
];

const TABLES: [string, string][] = [
  ...TENANT_OWNED.map((table): [string, string] => [table, 'tenant_id']),
  ['tenants', 'id'],
];

const TABLE_NAMES = TABLES.map(([table]) => table).sort();

const PRIVILEGES = [
  'SELECT',
  'INSERT',
  'UPDATE',
  'DELETE',
  'TRUNCATE',
  'REFERENCES',
  'TRIGGER',
];

const DELIVERY_DATE = '2026-11-20';

function at(longitude: number, latitude: number): GeoJsonPoint {
  return { type: 'Point', coordinates: [longitude, latitude] };
}

async function seedTenant(em: EntityManager, name: string): Promise<string> {
  const tenant = em.create(Tenant, { name });
  const depot = em.create(Depot, {
    tenant,
    name: `${name} depot`,
    location: at(30.5, 50.4),
  });
  const user = em.create(User, {
    tenant,
    cognitoSub: `rls-${name}`,
    email: `${name}@example.com`,
    name,
  });
  const driver = em.create(Driver, { user, tenant });
  const vehicle = em.create(Vehicle, {
    tenant,
    depot,
    driver,
    name: `${name} van`,
    capacity: 100,
  });
  const zone = em.create(Zone, {
    tenant,
    depot,
    name: `${name} zone`,
    area: {
      type: 'Polygon',
      coordinates: [
        [
          [30.4, 50.3],
          [30.6, 50.3],
          [30.6, 50.5],
          [30.4, 50.5],
          [30.4, 50.3],
        ],
      ],
    },
  });
  const store = em.create(Store, {
    tenant,
    name: `${name} store`,
    location: at(30.51, 50.41),
  });
  const routed = em.create(Order, {
    tenant,
    store,
    deliveryDate: DELIVERY_DATE,
    size: 10,
  });
  const unassigned = em.create(Order, {
    tenant,
    store,
    deliveryDate: DELIVERY_DATE,
    size: 20,
  });
  const job = em.create(RouteJob, {
    tenant,
    depot,
    requestedBy: user,
    deliveryDate: DELIVERY_DATE,
    status: 'done',
  });
  const route = em.create(Route, {
    tenant,
    job,
    vehicle,
    zone,
    driver,
    deliveryDate: DELIVERY_DATE,
    path: {
      type: 'LineString',
      coordinates: [
        [30.5, 50.4],
        [30.51, 50.41],
        [30.5, 50.4],
      ],
    },
    totalDistanceM: 2600,
  });
  em.create(RouteStop, {
    route,
    seq: 1,
    trip: 1,
    tenant,
    order: routed,
    distanceFromPrevM: 1300,
  });
  em.create(RouteJobUnassigned, {
    job,
    order: unassigned,
    tenant,
    reason: 'no_vehicle',
  });
  await em.flush();
  return tenant.id;
}

describe('Row-level security (integration)', () => {
  let db: TestDatabase;
  let tenantA: string;
  let tenantB: string;

  beforeAll(async () => {
    db = await startTestDatabase();

    const em = db.ownerOrm.em.fork();
    tenantA = await seedTenant(em, 'RLS tenant A');
    tenantB = await seedTenant(em, 'RLS tenant B');
  }, 120_000);

  afterAll(async () => {
    await db?.stop();
  });

  describe('RLS-1', () => {
    it.each(TABLES)(
      'RLS-1: %s shows only the rows of the transaction tenant',
      async (table, key) => {
        const rows = await inTenant(db.orm, tenantA, (em) =>
          em.execute<{ owner: string }[]>(
            `select distinct ${key} as owner from ${table}`,
          ),
        );

        expect(rows.map((row) => row.owner)).toEqual([tenantA]);
      },
    );

    it.each(TABLES)(
      'RLS-1: %s lets the transaction tenant update its own rows and no others',
      async (table, key) => {
        const rows = await inTenant(db.orm, tenantA, (em) =>
          em.execute<{ owner: string }[]>(
            `update ${table} set ${key} = ${key} returning ${key} as owner`,
          ),
        );

        expect([...new Set(rows.map((row) => row.owner))]).toEqual([tenantA]);
      },
    );

    it.each(TABLES)(
      'RLS-1: %s rejects a row written for another tenant',
      async (table, key) => {
        const patch = JSON.stringify({ id: randomUUID(), tenant_id: tenantB });

        await expect(
          inTenant(db.orm, tenantA, (em) =>
            em.execute(
              `insert into ${table}
               select (jsonb_populate_record(null::${table}, to_jsonb(t) || ?::jsonb)).*
               from ${table} t where ${key} = ?`,
              [patch, tenantA],
            ),
          ),
        ).rejects.toThrow(/row-level security/);
      },
    );

    it.each(TABLES)(
      'RLS-1: %s shows and updates no rows in a transaction without a tenant',
      async (table, key) => {
        const [seen, updated] = await db.orm.em
          .fork()
          .transactional(async (em) => [
            await em.execute(`select ${key} from ${table}`),
            await em.execute(
              `update ${table} set ${key} = ${key} returning ${key}`,
            ),
          ]);

        expect({ seen, updated }).toEqual({ seen: [], updated: [] });
      },
    );
  });

  describe('RLS-2', () => {
    it('RLS-2: the app role is not a superuser and lacks bypassrls', async () => {
      const rows = await db.ownerOrm.em
        .fork()
        .execute(
          'select rolsuper, rolbypassrls from pg_roles where rolname = ?',
          [APP_ROLE],
        );

      expect(rows).toEqual([{ rolsuper: false, rolbypassrls: false }]);
    });

    it('RLS-2: the app role neither owns nor is a member of the owner of any table in public', async () => {
      const rows = await db.ownerOrm.em.fork().execute<{ tablename: string }[]>(
        `select tablename from pg_tables
           where schemaname = 'public' and pg_has_role(?, tableowner, 'MEMBER')`,
        [APP_ROLE],
      );

      expect(rows).toEqual([]);
    });

    it('RLS-2: the app role has exactly select, insert, update and delete on the tenant-owned tables and tenants', async () => {
      const granted = await privilegesOf(TABLE_NAMES);

      expect(granted).toEqual(
        Object.fromEntries(
          TABLE_NAMES.map((table) => [
            table,
            ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
          ]),
        ),
      );
    });

    it('RLS-2: the app role has no privilege on any other table in public, including the migrations table', async () => {
      const rows = await db.ownerOrm.em.fork().execute<{ tablename: string }[]>(
        `select tablename from pg_tables
           where schemaname = 'public'
             and not (tablename = any(string_to_array(?, ',')))
             and tablename <> 'spatial_ref_sys'`,
        [TABLE_NAMES.join(',')],
      );
      const others = rows.map((row) => row.tablename).sort();

      expect(others).toContain('mikro_orm_migrations');
      expect(await privilegesOf(others)).toEqual(
        Object.fromEntries(others.map((table) => [table, []])),
      );
    });

    async function privilegesOf(
      tables: string[],
    ): Promise<Record<string, string[]>> {
      const em = db.ownerOrm.em.fork();
      const result: Record<string, string[]> = {};
      for (const table of tables) {
        const granted: string[] = [];
        for (const privilege of PRIVILEGES) {
          const [row] = await em.execute<{ granted: boolean }[]>(
            'select has_table_privilege(?, ?, ?) as granted',
            [APP_ROLE, `public.${table}`, privilege],
          );
          if (row?.granted) {
            granted.push(privilege);
          }
        }
        result[table] = granted;
      }
      return result;
    }
  });

  describe('RLS-3', () => {
    let interceptor: TenantContextInterceptor;

    class ProbeController {}
    function probe(): void {}

    class StoreProbe {
      @Transactional()
      async tenantsSeen(): Promise<string[]> {
        const rows = await db.orm.em
          .getKysely<DB>()
          .selectFrom('stores')
          .select('tenant_id')
          .distinct()
          .execute();
        return rows.map((row) => row.tenant_id);
      }
    }

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        providers: [
          TenantContextInterceptor,
          { provide: EntityManager, useValue: db.orm.em },
        ],
      }).compile();
      interceptor = moduleRef.get(TenantContextInterceptor);
    });

    function asRequest<T>(
      tenantId: string,
      work: () => Promise<T>,
    ): Promise<T> {
      const request = requestWith({});
      request.tenantId = tenantId;
      const context = contextFor(ProbeController, probe, request);
      return RequestContext.create(db.orm.em, async () => {
        const result = interceptor.intercept(context, {
          handle: () => defer(work),
        });
        return lastValueFrom(result as Observable<T>);
      });
    }

    it('RLS-3: a single ORM query outside a transaction sees only the request tenant, request after request', async () => {
      const seen: Record<string, string[]> = {};
      for (const tenantId of [tenantA, tenantB]) {
        const stores = await asRequest(tenantId, () =>
          db.orm.em.find(Store, {}),
        );
        seen[tenantId] = [...new Set(stores.map((store) => store.tenant.id))];
      }

      expect(seen).toEqual({ [tenantA]: [tenantA], [tenantB]: [tenantB] });
    });

    it('RLS-3: a flush in a request writes as the request tenant', async () => {
      const name = 'flushed in a request of A';

      await asRequest(tenantA, async () => {
        const em = db.orm.em;
        const tenant = await em.findOneOrFail(Tenant, tenantA);
        em.create(Store, { tenant, name, location: at(30.5, 50.4) });
        await em.flush();
      });

      const saved = await db.ownerOrm.em.fork().find(Store, { name });
      expect(
        saved.map((store) => ({ tenant: store.tenant.id, name: store.name })),
      ).toEqual([{ tenant: tenantA, name }]);
    });

    it('RLS-3: a @Transactional() method in a request sees only the request tenant', async () => {
      const seen = await asRequest(tenantB, () =>
        new StoreProbe().tenantsSeen(),
      );

      expect(seen).toEqual([tenantB]);
    });

    it('RLS-3: the tenant does not outlive the request transaction on the same connection', async () => {
      const [inside] = await asRequest(tenantA, () =>
        db.orm.em.execute<{ pid: number }[]>('select pg_backend_pid() as pid'),
      );

      const pool = await db.orm.em.getConnection().getNativeClient();
      const after = await pool.query(
        'select pg_backend_pid() as pid, (select count(*)::int from stores) as visible',
      );

      expect(after.rows).toEqual([{ pid: inside?.pid, visible: 0 }]);
    });
  });
});
