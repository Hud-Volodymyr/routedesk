import type { GeoJsonPoint, GeoJsonPolygon } from '@routedesk/shared';
import { Depot } from '../../src/depots/depot.entity.js';
import { Tenant } from '../../src/tenants/tenant.entity.js';
import { Zone } from '../../src/zones/zone.entity.js';
import {
  startTestDatabase,
  type TestDatabase,
} from '../helpers/test-database.js';

function at(longitude: number, latitude: number): GeoJsonPoint {
  return { type: 'Point', coordinates: [longitude, latitude] };
}

function box(
  west: number,
  south: number,
  east: number,
  north: number,
): GeoJsonPolygon {
  return {
    type: 'Polygon',
    coordinates: [
      [
        [west, south],
        [east, south],
        [east, north],
        [west, north],
        [west, south],
      ],
    ],
  };
}

const CENTRE_AND_RIGHT_BANK_SOUTH = at(30.48, 50.44);
const LEFT_BANK_NORTH_ONLY = at(30.7, 50.47);
const BETWEEN_THE_BANKS = at(30.57, 50.45);
const AGE_TIE = at(31.05, 50.05);
const ID_TIE = at(31.25, 50.05);

describe('ZoneRepository (integration)', () => {
  let db: TestDatabase;
  let kyivId: string;
  let tieBreakId: string;
  const kyivZones = new Map<string, { id: string; depotId: string }>();
  let sviatoshynId: string;
  let darnytsiaId: string;

  beforeAll(async () => {
    db = await startTestDatabase();

    const em = db.orm.em.fork();
    const kyiv = await em.findOneOrFail(Tenant, { name: 'Kyiv Distribution' });
    const sviatoshyn = await em.findOneOrFail(Depot, {
      tenant: kyiv,
      name: 'Sviatoshyn Depot',
    });
    const darnytsia = await em.findOneOrFail(Depot, {
      tenant: kyiv,
      name: 'Darnytsia Depot',
    });
    for (const zone of await em.find(Zone, { tenant: kyiv })) {
      kyivZones.set(zone.name, { id: zone.id, depotId: zone.depot.id });
    }

    const rival = em.create(Tenant, { name: 'Rival tenant' });
    const rivalDepot = em.create(Depot, {
      tenant: rival,
      name: 'Rival depot',
      location: at(30.48, 50.44),
    });
    em.create(Zone, {
      tenant: rival,
      depot: rivalDepot,
      name: 'Rival zone',
      area: box(30.4, 50.4, 30.6, 50.5),
      priority: 100,
    });

    const tieBreak = em.create(Tenant, { name: 'Tie-break test' });
    const tieDepot = em.create(Depot, {
      tenant: tieBreak,
      name: 'Tie-break depot',
      location: AGE_TIE,
    });
    const ageBox = box(31.0, 50.0, 31.1, 50.1);
    em.create(Zone, {
      id: '00000000-0000-4000-8000-000000000001',
      tenant: tieBreak,
      depot: tieDepot,
      name: 'oldest but lower priority',
      area: ageBox,
      priority: 4,
      createdAt: new Date('2025-01-01T00:00:00Z'),
    });
    em.create(Zone, {
      id: '00000000-0000-4000-8000-000000000002',
      tenant: tieBreak,
      depot: tieDepot,
      name: 'newer',
      area: ageBox,
      priority: 5,
      createdAt: new Date('2026-02-01T00:00:00Z'),
    });
    em.create(Zone, {
      id: '00000000-0000-4000-8000-000000000009',
      tenant: tieBreak,
      depot: tieDepot,
      name: 'older',
      area: ageBox,
      priority: 5,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });

    const idBox = box(31.2, 50.0, 31.3, 50.1);
    em.create(Zone, {
      id: '00000000-0000-4000-8000-000000000012',
      tenant: tieBreak,
      depot: tieDepot,
      name: 'higher id',
      area: idBox,
      priority: 5,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });
    em.create(Zone, {
      id: '00000000-0000-4000-8000-000000000011',
      tenant: tieBreak,
      depot: tieDepot,
      name: 'lower id',
      area: idBox,
      priority: 5,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });
    await em.flush();

    kyivId = kyiv.id;
    sviatoshynId = sviatoshyn.id;
    darnytsiaId = darnytsia.id;
    tieBreakId = tieBreak.id;
  }, 120_000);

  afterAll(async () => {
    await db?.stop();
  });

  function zones() {
    return db.orm.em.fork().getRepository(Zone);
  }

  it('GEO-3: picks the highest-priority zone where City Centre overlaps Right Bank South, ignoring a higher-priority zone of another tenant', async () => {
    const zone = await zones().findCovering(
      kyivId,
      CENTRE_AND_RIGHT_BANK_SOUTH,
    );

    expect(zone).toEqual({
      id: kyivZones.get('City Centre')?.id,
      name: 'City Centre',
      priority: 10,
      depotId: sviatoshynId,
    });
  });

  it('GEO-3: returns the depot that owns the zone', async () => {
    const zone = await zones().findCovering(kyivId, LEFT_BANK_NORTH_ONLY);

    expect(zone).toEqual({
      id: kyivZones.get('Left Bank North')?.id,
      name: 'Left Bank North',
      priority: 0,
      depotId: darnytsiaId,
    });
  });

  it('GEO-3: returns undefined for a point in no zone', async () => {
    expect(
      await zones().findCovering(kyivId, BETWEEN_THE_BANKS),
    ).toBeUndefined();
  });

  it('GEO-3: breaks a priority tie with the oldest zone, over a lower id', async () => {
    const zone = await zones().findCovering(tieBreakId, AGE_TIE);

    expect(zone?.name).toBe('older');
  });

  it('GEO-3: breaks a priority and age tie with the lowest id', async () => {
    const zone = await zones().findCovering(tieBreakId, ID_TIE);

    expect(zone?.name).toBe('lower id');
  });
});
