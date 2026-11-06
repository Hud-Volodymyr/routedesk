import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import type { GeoJsonPoint } from '@routedesk/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { Depot } from '../../src/depots/depot.entity.js';
import { Store } from '../../src/stores/store.entity.js';
import { Tenant } from '../../src/tenants/tenant.entity.js';
import { Zone } from '../../src/zones/zone.entity.js';
import { createTestApp } from '../helpers/test-app.js';
import {
  startTestDatabase,
  type TestDatabase,
} from '../helpers/test-database.js';
import { tenantHeader } from '../helpers/tenant.js';

function at(longitude: number, latitude: number): GeoJsonPoint {
  return { type: 'Point', coordinates: [longitude, latitude] };
}

const EAST = at(30.61, 50.6);
const NORTH = at(30.6, 50.607);
const FAR = at(30.6, 50.63);
const WITHIN_750_M = '/stores/within?lng=30.6&lat=50.6&radiusKm=0.75';

function byPath(issues: { path: string }[]): { path: string }[] {
  return [...issues].sort((a, b) => a.path.localeCompare(b.path));
}

describe('Stores (e2e)', () => {
  let db: TestDatabase;
  let app: INestApplication<App>;
  let kyivId: string;
  let geoTenantId: string;
  let geoDepotId: string;
  let sviatoshynId: string;
  let cityCentreId: string;
  let lvivDepotId: string;
  let lvivStoreId: string;
  let centreStoreId: string;
  let noZoneStoreId: string;
  let eastId: string;
  let northId: string;

  beforeAll(async () => {
    db = await startTestDatabase();
    app = await createTestApp(db);

    const em = db.orm.em.fork();
    const kyiv = await em.findOneOrFail(Tenant, { name: 'Kyiv Distribution' });
    const lviv = await em.findOneOrFail(Tenant, { name: 'Lviv Supply' });
    const sviatoshyn = await em.findOneOrFail(Depot, {
      tenant: kyiv,
      name: 'Sviatoshyn Depot',
    });
    const cityCentre = await em.findOneOrFail(Zone, {
      tenant: kyiv,
      name: 'City Centre',
    });
    const lvivDepot = await em.findOneOrFail(Depot, { tenant: lviv });
    const lvivStore = await em.findOneOrFail(Store, { tenant: lviv });

    const centreStore = em.create(Store, {
      tenant: kyiv,
      name: 'In City Centre and Right Bank South',
      location: at(30.48, 50.44),
    });
    const noZoneStore = em.create(Store, {
      tenant: kyiv,
      name: 'Between the banks',
      location: at(30.57, 50.45),
    });

    const geoTenant = em.create(Tenant, { name: 'E2E geo tenant' });
    const geoDepot = em.create(Depot, {
      tenant: geoTenant,
      name: 'E2E depot',
      location: at(30.6, 50.6),
    });
    const east = em.create(Store, {
      tenant: geoTenant,
      name: 'east',
      location: EAST,
    });
    const north = em.create(Store, {
      tenant: geoTenant,
      name: 'north',
      location: NORTH,
    });
    em.create(Store, { tenant: geoTenant, name: 'far', location: FAR });
    for (let index = 0; index < 9; index += 1) {
      em.create(Store, {
        tenant: geoTenant,
        name: `filler ${index}`,
        location: at(30.6, 51 + index * 0.01),
      });
    }
    await em.flush();

    kyivId = kyiv.id;
    geoTenantId = geoTenant.id;
    geoDepotId = geoDepot.id;
    sviatoshynId = sviatoshyn.id;
    cityCentreId = cityCentre.id;
    lvivDepotId = lvivDepot.id;
    lvivStoreId = lvivStore.id;
    centreStoreId = centreStore.id;
    noZoneStoreId = noZoneStore.id;
    eastId = east.id;
    northId = north.id;
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  function get(url: string, tenantId: string) {
    return request(app.getHttpServer()).get(url).set(tenantHeader(tenantId));
  }

  describe('tenant header', () => {
    it.each([
      WITHIN_750_M,
      `/stores/nearest?depotId=${randomUUID()}`,
      `/stores/${randomUUID()}/zone`,
    ])('TENANT-1: %s without X-Tenant-Id is 401', async (url) => {
      const response = await request(app.getHttpServer()).get(url);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /stores/within', () => {
    it('GEO-1: converts radiusKm to metres and returns stores with id, name, GeoJSON location and distance', async () => {
      const response = await get(WITHIN_750_M, geoTenantId);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        {
          id: eastId,
          name: 'east',
          location: EAST,
          distanceM: expect.closeTo(707, -1),
        },
      ]);
    });

    it('VALID-1: invalid input is 400 with the validation body listing each parameter', async () => {
      const response = await get('/stores/within?lng=181&lat=91', geoTenantId);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: 'Validation failed',
        issues: expect.any(Array),
      });
      expect(byPath(response.body.issues)).toEqual([
        { path: 'lat', message: expect.any(String) },
        { path: 'lng', message: expect.any(String) },
        { path: 'radiusKm', message: expect.any(String) },
      ]);
    });

    it('VALID-3: a repeated parameter is 400', async () => {
      const response = await get(
        '/stores/within?lng=30.6&lng=30.7&lat=50.6&radiusKm=1',
        geoTenantId,
      );

      expect(response.status).toBe(400);
    });
  });

  describe('GET /stores/nearest', () => {
    it('GEO-2: returns the k stores nearest the depot, shaped as in GEO-1', async () => {
      const response = await get(
        `/stores/nearest?depotId=${geoDepotId}&k=2`,
        geoTenantId,
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        {
          id: eastId,
          name: 'east',
          location: EAST,
          distanceM: expect.closeTo(707, -1),
        },
        {
          id: northId,
          name: 'north',
          location: NORTH,
          distanceM: expect.closeTo(779, -1),
        },
      ]);
    });

    it('VALID-1: applies the default k of 10 when k is missing', async () => {
      const response = await get(
        `/stores/nearest?depotId=${geoDepotId}`,
        geoTenantId,
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(10);
      expect(
        response.body.slice(0, 3).map((store: { name: string }) => store.name),
      ).toEqual(['east', 'north', 'far']);
    });

    it('VALID-1: an invalid depotId is 400 with the validation body', async () => {
      const response = await get(
        '/stores/nearest?depotId=not-a-uuid',
        geoTenantId,
      );

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: 'Validation failed',
        issues: [{ path: 'depotId', message: expect.any(String) }],
      });
    });

    it('TENANT-3: another tenant depot is 404 without the search conditions', async () => {
      const response = await get(
        `/stores/nearest?depotId=${lvivDepotId}`,
        kyivId,
      );

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ statusCode: 404, message: 'Not Found' });
      expect(response.text).not.toContain(kyivId);
      expect(response.text).not.toContain(lvivDepotId);
    });
  });

  describe('GET /stores/:id/zone', () => {
    it('GEO-3: returns the winning zone of the store', async () => {
      const response = await get(`/stores/${centreStoreId}/zone`, kyivId);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        zone: {
          id: cityCentreId,
          name: 'City Centre',
          priority: 10,
          depotId: sviatoshynId,
        },
      });
    });

    it('GEO-3: returns { zone: null } for a store in no zone', async () => {
      const response = await get(`/stores/${noZoneStoreId}/zone`, kyivId);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ zone: null });
    });

    it('VALID-4: an :id that is not a UUID is 400 in Nest default shape', async () => {
      const response = await get('/stores/not-a-uuid/zone', kyivId);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        statusCode: 400,
        message: expect.any(String),
        error: 'Bad Request',
      });
    });

    it('TENANT-3: another tenant store is 404 without the search conditions', async () => {
      const response = await get(`/stores/${lvivStoreId}/zone`, kyivId);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ statusCode: 404, message: 'Not Found' });
      expect(response.text).not.toContain(kyivId);
      expect(response.text).not.toContain(lvivStoreId);
    });
  });
});
