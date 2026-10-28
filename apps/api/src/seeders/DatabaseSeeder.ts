import type { GeoJsonPoint, GeoJsonPolygon, Position } from '@routedesk/shared';
import type { EntityManager } from '@mikro-orm/postgresql';
import { Seeder } from '@mikro-orm/seeder';
import { fakerUK as faker } from '@faker-js/faker';
import { Depot } from '../depots/depot.entity.js';
import { Driver } from '../drivers/driver.entity.js';
import { Order } from '../orders/order.entity.js';
import { Store } from '../stores/store.entity.js';
import { Tenant } from '../tenants/tenant.entity.js';
import { User } from '../users/user.entity.js';
import { Vehicle } from '../vehicles/vehicle.entity.js';
import { Zone } from '../zones/zone.entity.js';

/**
 * Local development data. Every part exists to exercise a specific behaviour:
 *
 * - Two tenants: "Київ Дистрибуція" (realistic volume) and "Львів Постач" (small, for isolation tests).
 * - Kyiv has one depot per bank of the Dnipro, so per-depot planning has something to show (decision 020).
 * - Stores are generated inside each bank's rough boundary, so none land in the river.
 * - Zones leave a strip uncovered on each bank, so some stores are in no zone (decision 015),
 *   and the right bank has an overlapping high-priority centre zone (decision 013).
 * - Vehicles have different capacities and some may reload (decision 021); one has no driver.
 * - Orders don't fit in single trips, and one order is larger than any vehicle (over_capacity).
 *
 * The random generator is seeded, so every run produces the same data.
 * Run with: pnpm --filter @routedesk/api orm seeder:run
 */

// The day all seeded orders are for. Fixed, so tests and EXPLAIN ANALYZE results are reproducible.
export const SEED_DELIVERY_DATE = '2026-11-02';

// Rough land boundaries, drawn with a margin from the river. [longitude, latitude].
const KYIV_RIGHT_BANK: Position[] = [
  [30.3, 50.36], [30.55, 50.36], [30.52, 50.44], [30.49, 50.52], [30.3, 50.52], [30.3, 50.36],
];
const KYIV_LEFT_BANK: Position[] = [
  [30.62, 50.37], [30.8, 50.37], [30.8, 50.5], [30.59, 50.5], [30.61, 50.44], [30.62, 50.37],
];
const LVIV_AREA: Position[] = [
  [23.95, 49.8], [24.1, 49.8], [24.1, 49.88], [23.95, 49.88], [23.95, 49.8],
];

export class DatabaseSeeder extends Seeder {
  override async run(em: EntityManager): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Refusing to seed a production database.');
    }

    faker.seed(42);

    // Start from empty tables on every run. Every tenant-owned table references tenants,
    // so one cascading truncate clears them all.
    await em.execute('truncate table "tenants" cascade');

    this.seedKyiv(em);
    this.seedLviv(em);

    await em.flush();
  }

  private seedKyiv(em: EntityManager): void {
    const tenant = em.create(Tenant, { name: 'Kyiv Distribution' });
    createUser(em, tenant, 'kyiv-admin', 'Administrator');
 
    const right = em.create(Depot, {
      tenant,
      name: 'Sviatoshyn Depot',
      address: faker.location.streetAddress(),
      location: point(30.37, 50.46),
    });
    const left = em.create(Depot, {
      tenant,
      name: 'Darnytsia Depot',
      address: faker.location.streetAddress(),
      location: point(30.66, 50.43),
    });
 
    createUser(em, tenant, 'kyiv-dispatcher-right', 'Sviatoshyn Dispatcher');
    createUser(em, tenant, 'kyiv-dispatcher-left', 'Darnytsia Dispatcher');
 
    // Right bank: north and south halves, leaving the strip west of 30.33 uncovered,
    // plus a centre zone that overlaps both and wins by priority.
    createZone(em, tenant, right, 'Right Bank North', box(30.33, 50.46, 30.52, 50.52), 0);
    createZone(em, tenant, right, 'Right Bank South', box(30.33, 50.36, 30.55, 50.46), 0);
    createZone(em, tenant, right, 'City Centre', box(30.44, 50.42, 30.52, 50.48), 10);
 
    // Left bank: north and south, leaving the strip east of 30.77 in the south uncovered.
    createZone(em, tenant, left, 'Left Bank North', box(30.59, 50.44, 30.8, 50.5), 0);
    createZone(em, tenant, left, 'Left Bank South', box(30.61, 50.37, 30.77, 50.44), 0);
 
    // Capacities and reloads per vehicle. The last vehicle of each depot has no driver.
    const fleet = [
      { capacity: 80, maxTrips: 1 },
      { capacity: 80, maxTrips: 1 },
      { capacity: 120, maxTrips: 2 },
      { capacity: 120, maxTrips: 1 },
      { capacity: 200, maxTrips: 2 },
    ];
    for (const [depot, key] of [[right, 'right'], [left, 'left']] as const) {
      fleet.forEach((spec, i) => {
        const hasDriver = i < fleet.length - 1;
        const driver = hasDriver
          ? createDriver(em, tenant, `kyiv-driver-${key}-${i + 1}`)
          : null;
        em.create(Vehicle, {
          tenant,
          depot,
          driver,
          name: `${depot.name} van ${i + 1}`,
          capacity: spec.capacity,
          maxTrips: spec.maxTrips,
        });
      });
    }
 
    const stores = [
      ...createStores(em, tenant, KYIV_RIGHT_BANK, 100),
      ...createStores(em, tenant, KYIV_LEFT_BANK, 100),
    ];
    createOrders(em, tenant, stores);
 
    // Larger than any vehicle's capacity, so planning must report it as over_capacity.
    const firstStore = stores[0];
    if (firstStore) {
      em.create(Order, { tenant, store: firstStore, deliveryDate: SEED_DELIVERY_DATE, size: 250 });
    }
  }

  private seedLviv(em: EntityManager): void {
    const tenant = em.create(Tenant, { name: 'Lviv Supply' });
    createUser(em, tenant, 'lviv-admin', 'Administrator');
    createUser(em, tenant, 'lviv-dispatcher', 'Dispatcher');
 
    const depot = em.create(Depot, {
      tenant,
      name: 'Lviv Depot',
      address: faker.location.streetAddress(),
      location: point(24.03, 49.84),
    });
    createZone(em, tenant, depot, 'Lviv', polygon(LVIV_AREA), 0);
 
    for (let i = 1; i <= 2; i++) {
      em.create(Vehicle, {
        tenant,
        depot,
        driver: createDriver(em, tenant, `lviv-driver-${i}`),
        name: `Lviv Depot van ${i}`,
        capacity: 100,
      });
    }
 
    const stores = createStores(em, tenant, LVIV_AREA, 15);
    createOrders(em, tenant, stores);
  }
}

// ---------------------------------------------------------------
// Entity helpers
// ---------------------------------------------------------------

// cognitoSub is a placeholder
function createUser(em: EntityManager, tenant: Tenant, key: string, name: string): User {
  return em.create(User, {
    tenant,
    cognitoSub: `seed-${key}`,
    email: `${key}@routedesk.test`,
    name,
  });
}

function createDriver(em: EntityManager, tenant: Tenant, key: string): Driver {
  const user = createUser(em, tenant, key, faker.person.fullName());
  return em.create(Driver, { user, tenant, phone: faker.phone.number() });
}

function createZone(
  em: EntityManager,
  tenant: Tenant,
  depot: Depot,
  name: string,
  area: GeoJsonPolygon,
  priority: number,
): Zone {
  return em.create(Zone, { tenant, depot, name, area, priority });
}

function createStores(em: EntityManager, tenant: Tenant, area: Position[], count: number): Store[] {
  return Array.from({ length: count }, () =>
    em.create(Store, {
      tenant,
      name: faker.company.name(),
      address: faker.location.streetAddress(),
      location: randomPointIn(area),
    }),
  );
}

// Most stores get one order, some get two, some none. Sizes are in the same unit as capacity.
function createOrders(em: EntityManager, tenant: Tenant, stores: Store[]): void {
  for (const store of stores) {
    const count = faker.helpers.weightedArrayElement([
      { value: 0, weight: 25 },
      { value: 1, weight: 65 },
      { value: 2, weight: 10 },
    ]);
    for (let i = 0; i < count; i++) {
      em.create(Order, {
        tenant,
        store,
        deliveryDate: SEED_DELIVERY_DATE,
        size: faker.number.int({ min: 3, max: 15 }),
      });
    }
  }
}

// ---------------------------------------------------------------
// Geometry helpers (plain lng/lat math, fine for city-sized areas)
// ---------------------------------------------------------------

function point(longitude: number, latitude: number): GeoJsonPoint {
  return { type: 'Point', coordinates: [longitude, latitude] };
}

function polygon(ring: Position[]): GeoJsonPolygon {
  return { type: 'Polygon', coordinates: [ring] };
}

// An axis-aligned rectangle as a closed polygon ring.
function box(west: number, south: number, east: number, north: number): GeoJsonPolygon {
  return polygon([
    [west, south], [east, south], [east, north], [west, north], [west, south],
  ]);
}

// Picks random points in the ring's bounding box until one falls inside the ring.
function randomPointIn(ring: Position[]): GeoJsonPoint {
  const lngs = ring.map(([lng]) => lng);
  const lats = ring.map(([, lat]) => lat);
  const bounds = {
    west: Math.min(...lngs),
    east: Math.max(...lngs),
    south: Math.min(...lats),
    north: Math.max(...lats),
  };

  while (true) {
    const candidate: Position = [
      faker.number.float({ min: bounds.west, max: bounds.east, fractionDigits: 6 }),
      faker.number.float({ min: bounds.south, max: bounds.north, fractionDigits: 6 }),
    ];
    if (isInside(candidate, ring)) {
      return { type: 'Point', coordinates: candidate };
    }
  }
}

// count how many ring edges a horizontal ray from the point crosses.
// An odd count means the point is inside.
function isInside([x, y]: Position, ring: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (!a || !b) continue;
    const [xi, yi] = a;
    const [xj, yj] = b;
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}
