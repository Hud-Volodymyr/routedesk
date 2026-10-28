import type { GeoJsonPoint } from '@routedesk/shared';
import { Depot } from '../src/depots/depot.entity.js';
import { Order } from '../src/orders/order.entity.js';
import { RouteJob } from '../src/route-jobs/route-job.entity.js';
import { Route } from '../src/routes/route.entity.js';
import { SEED_DELIVERY_DATE } from '../src/seeders/DatabaseSeeder.js';
import { Store } from '../src/stores/store.entity.js';
import { Tenant } from '../src/tenants/tenant.entity.js';
import { User } from '../src/users/user.entity.js';
import { Vehicle } from '../src/vehicles/vehicle.entity.js';
import { Zone } from '../src/zones/zone.entity.js';
import { startTestDatabase, type TestDatabase } from './test-database.js';

describe('Database (integration)', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await startTestDatabase();
  }, 120_000); // pulling the image on the first run can be slow

  afterAll(async () => {
    await db?.stop();
  });

  it('seeds 200 stores for Kyiv Distribution and 15 for Lviv Supply', async () => {
    const em = db.orm.em.fork();

    const kyiv = await em.findOneOrFail(Tenant, { name: 'Kyiv Distribution' });
    const lviv = await em.findOneOrFail(Tenant, { name: 'Lviv Supply' });

    expect(await em.count(Store, { tenant: kyiv })).toBe(200);
    expect(await em.count(Store, { tenant: lviv })).toBe(15);
  });

  it('seeds an order larger than any vehicle can carry', async () => {
    const em = db.orm.em.fork();

    const order = await em.findOne(Order, { size: 250 });
    const vehiclesThatFit = await em.count(Vehicle, { capacity: { $gte: 250 } });

    expect(order).not.toBeNull();
    expect(vehiclesThatFit).toBe(0);
  });

  it('returns a store location exactly as it was saved', async () => {
    const em = db.orm.em.fork();
    const tenant = await em.findOneOrFail(Tenant, { name: 'Lviv Supply' });
    const location: GeoJsonPoint = { type: 'Point', coordinates: [24.031111, 49.842222] };

    const store = em.create(Store, { tenant, name: 'Round-trip store', location });
    await em.flush();
    em.clear();

    const loaded = await em.findOneOrFail(Store, { id: store.id });
    expect(loaded.location).toEqual(location);
  });

  it('saves a changed location on flush', async () => {
    const em = db.orm.em.fork();
    const store = await em.findOneOrFail(Store, { tenant: { name: 'Kyiv Distribution' } });
    const newLocation: GeoJsonPoint = { type: 'Point', coordinates: [30.5234, 50.4501] };

    store.location = newLocation;
    await em.flush();
    em.clear();

    const reloaded = await em.findOneOrFail(Store, { id: store.id });
    expect(reloaded.location).toEqual(newLocation);
  });

  it('returns route distances as numbers', async () => {
    const em = db.orm.em.fork();
    const tenant = await em.findOneOrFail(Tenant, { name: 'Lviv Supply' });
    const depot = await em.findOneOrFail(Depot, { tenant });
    const vehicle = await em.findOneOrFail(Vehicle, { depot });
    const zone = await em.findOneOrFail(Zone, { depot });
    const dispatcher = await em.findOneOrFail(User, { cognitoSub: 'seed-lviv-dispatcher' });

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
      path: {
        type: 'LineString',
        coordinates: [depot.location.coordinates, [24.05, 49.85], depot.location.coordinates],
      },
      totalDistanceM: 1234.5,
    });
    await em.flush();
    em.clear();

    const loaded = await em.findOneOrFail(Route, { id: route.id });
    expect(typeof loaded.totalDistanceM).toBe('number');
    expect(loaded.totalDistanceM).toBe(1234.5);
  });
});
