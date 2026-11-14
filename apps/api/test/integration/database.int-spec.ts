import type {
  GeoJsonLineString,
  GeoJsonPoint,
  GeoJsonPolygon,
} from '@routedesk/shared';
import type { EntityManager } from '@mikro-orm/postgresql';
import { Depot } from '../../src/depots/depot.entity.js';
import { Order } from '../../src/orders/order.entity.js';
import { RouteJob } from '../../src/route-jobs/route-job.entity.js';
import { Route } from '../../src/routes/route.entity.js';
import { SEED_DELIVERY_DATE } from '../../src/seeders/DatabaseSeeder.js';
import { Store } from '../../src/stores/store.entity.js';
import { Tenant } from '../../src/tenants/tenant.entity.js';
import { User } from '../../src/users/user.entity.js';
import { Vehicle } from '../../src/vehicles/vehicle.entity.js';
import { Zone } from '../../src/zones/zone.entity.js';
import {
  startTestDatabase,
  type TestDatabase,
} from '../helpers/test-database.js';

async function saveLvivRoute(em: EntityManager, path: GeoJsonLineString) {
  const tenant = await em.findOneOrFail(Tenant, { name: 'Lviv Supply' });
  const depot = await em.findOneOrFail(Depot, { tenant });
  const vehicle = await em.findOneOrFail(Vehicle, { depot });
  const zone = await em.findOneOrFail(Zone, { depot });
  const dispatcher = await em.findOneOrFail(User, {
    cognitoSub: 'seed-lviv-dispatcher',
  });

  const job = em.create(RouteJob, {
    tenant,
    depot,
    requestedBy: dispatcher,
    deliveryDate: SEED_DELIVERY_DATE,
    status: 'done',
  });
  const route = em.create(Route, {
    tenant,
    job,
    vehicle,
    zone,
    deliveryDate: SEED_DELIVERY_DATE,
    path,
    totalDistanceM: 1,
  });
  await em.flush();
  return { tenant, route };
}

describe('Database (integration)', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await startTestDatabase();
  }, 120_000); // pulling the image on the first run can be slow

  afterAll(async () => {
    await db?.stop();
  });

  it('SEED-1: seeds exactly Kyiv Distribution with 200 stores and Lviv Supply with 15', async () => {
    const em = db.ownerOrm.em.fork();

    const tenants = await em.findAll(Tenant, { orderBy: { name: 'asc' } });
    expect(tenants.map((t) => t.name)).toEqual([
      'Kyiv Distribution',
      'Lviv Supply',
    ]);

    const [kyiv, lviv] = tenants;
    expect(await em.count(Store, { tenant: kyiv })).toBe(200);
    expect(await em.count(Store, { tenant: lviv })).toBe(15);
  });

  it("SEED-1: seeds an order heavier than every vehicle of the order's own tenant", async () => {
    const em = db.ownerOrm.em.fork();

    const vehicles = await em.findAll(Vehicle);
    const largestCapacity = new Map<string, number>();
    for (const vehicle of vehicles) {
      const tenantId = vehicle.tenant.id;
      largestCapacity.set(
        tenantId,
        Math.max(largestCapacity.get(tenantId) ?? 0, vehicle.capacity),
      );
    }

    const orders = await em.findAll(Order);
    const tooHeavy = orders.filter(
      (order) => order.size > (largestCapacity.get(order.tenant.id) ?? 0),
    );

    expect(tooHeavy.length).toBeGreaterThan(0);
  });

  it('SEED-2: seeds each tenant with its fixed ID', async () => {
    const em = db.ownerOrm.em.fork();

    const tenants = await em.findAll(Tenant, { orderBy: { name: 'asc' } });

    expect(tenants.map((t) => ({ name: t.name, id: t.id }))).toEqual([
      { name: 'Kyiv Distribution', id: 'a1000000-0000-4000-8000-000000000001' },
      { name: 'Lviv Supply', id: 'a1000000-0000-4000-8000-000000000002' },
    ]);
  });

  it('TYPES-3: returns Point, LineString and Polygon values equal to the ones saved', async () => {
    const em = db.ownerOrm.em.fork();
    const location: GeoJsonPoint = {
      type: 'Point',
      coordinates: [24.031111, 49.842222],
    };
    const path: GeoJsonLineString = {
      type: 'LineString',
      coordinates: [
        [24.012345, 49.83321],
        [24.051234, 49.851234],
        [24.012345, 49.83321],
      ],
    };
    const area: GeoJsonPolygon = {
      type: 'Polygon',
      coordinates: [
        [
          [23.98, 49.81],
          [24.07, 49.81],
          [24.07, 49.87],
          [23.98, 49.87],
          [23.98, 49.81],
        ],
      ],
    };

    const { tenant, route } = await saveLvivRoute(em, path);
    const depot = await em.findOneOrFail(Depot, { tenant });
    const store = em.create(Store, {
      tenant,
      name: 'Round-trip store',
      location,
    });
    const zone = em.create(Zone, {
      tenant,
      depot,
      name: 'Round-trip zone',
      area,
    });
    await em.flush();
    em.clear();

    expect((await em.findOneOrFail(Store, { id: store.id })).location).toEqual(
      location,
    );
    expect((await em.findOneOrFail(Route, { id: route.id })).path).toEqual(
      path,
    );
    expect((await em.findOneOrFail(Zone, { id: zone.id })).area).toEqual(area);
  });

  it('TYPES-3: saves a changed Point on flush', async () => {
    const em = db.ownerOrm.em.fork();
    const store = await em.findOneOrFail(Store, {
      tenant: { name: 'Kyiv Distribution' },
    });
    const newLocation: GeoJsonPoint = {
      type: 'Point',
      coordinates: [30.523456, 50.450123],
    };
    expect(store.location).not.toEqual(newLocation);

    store.location = newLocation;
    await em.flush();
    em.clear();

    const reloaded = await em.findOneOrFail(Store, { id: store.id });
    expect(reloaded.location).toEqual(newLocation);
  });
});
