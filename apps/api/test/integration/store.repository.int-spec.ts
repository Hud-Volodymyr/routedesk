import type { GeoJsonPoint } from '@routedesk/shared';
import { Store } from '../../src/stores/store.entity.js';
import { Tenant } from '../../src/tenants/tenant.entity.js';
import {
  startTestDatabase,
  type TestDatabase,
} from '../helpers/test-database.js';

function at(longitude: number, latitude: number): GeoJsonPoint {
  return { type: 'Point', coordinates: [longitude, latitude] };
}

const CENTRE = at(30.6, 50.6);

const OWN_STORES = {
  here: at(30.6, 50.6),
  east: at(30.61, 50.6),
  north: at(30.6, 50.607),
  south: at(30.6, 50.59),
  far: at(30.6, 50.63),
};

const FOREIGN_STORES = {
  'foreign centre': at(30.6, 50.6),
  'foreign near': at(30.6, 50.601),
};

type OwnName = keyof typeof OWN_STORES;

describe('StoreRepository (integration)', () => {
  let db: TestDatabase;
  let tenantId: string;
  const ids = new Map<string, string>();

  beforeAll(async () => {
    db = await startTestDatabase();

    const em = db.orm.em.fork();
    const tenant = em.create(Tenant, { name: 'Store repository test' });
    const foreign = em.create(Tenant, { name: 'Foreign tenant' });
    const created = [
      ...Object.entries(OWN_STORES).map(([name, location]) =>
        em.create(Store, { tenant, name, location }),
      ),
      ...Object.entries(FOREIGN_STORES).map(([name, location]) =>
        em.create(Store, { tenant: foreign, name, location }),
      ),
    ];
    await em.flush();

    for (const store of created) {
      ids.set(store.name, store.id);
    }
    tenantId = tenant.id;
  }, 120_000);

  afterAll(async () => {
    await db?.stop();
  });

  function stores() {
    return db.orm.em.fork().getRepository(Store);
  }

  function expected(name: OwnName, distanceM: number) {
    return {
      id: ids.get(name),
      name,
      location: OWN_STORES[name],
      distanceM: distanceM === 0 ? 0 : expect.closeTo(distanceM, -1),
    };
  }

  function names(result: { name: string }[]): string[] {
    return result.map((store) => store.name);
  }

  describe('findWithin', () => {
    it('GEO-1: returns the stores within the radius with id, name, GeoJSON location and surface distance in metres, nearest first', async () => {
      const result = await stores().findWithin(tenantId, CENTRE, 1000);

      expect(result).toEqual([
        expected('here', 0),
        expected('east', 707),
        expected('north', 779),
      ]);
    });

    it('GEO-1: includes a store exactly at the radius, here a zero radius on the store itself', async () => {
      const result = await stores().findWithin(tenantId, CENTRE, 0);

      expect(result).toEqual([expected('here', 0)]);
    });

    it('GEO-1: never returns another tenant store, even at the centre', async () => {
      const result = await stores().findWithin(tenantId, CENTRE, 200);

      expect(names(result)).toEqual(['here']);
    });
  });

  describe('findNearestToLocation', () => {
    it('GEO-2: returns the k nearest stores by surface distance, nearest first, shaped as in GEO-1', async () => {
      const result = await stores().findNearestToLocation(tenantId, CENTRE, 2);

      expect(result).toEqual([expected('here', 0), expected('east', 707)]);
    });

    it('GEO-2: never returns another tenant store, even when it is nearest', async () => {
      const result = await stores().findNearestToLocation(
        tenantId,
        at(30.6, 50.601),
        1,
      );

      expect(result).toEqual([
        {
          id: ids.get('here'),
          name: 'here',
          location: OWN_STORES.here,
          distanceM: expect.closeTo(111, -1),
        },
      ]);
    });
  });
});
