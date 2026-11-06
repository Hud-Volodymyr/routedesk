# Geo queries

Stores near a point, stores nearest a depot, and the zone a store belongs to.

## Requirements

- **GEO-1** Stores within a radius of a point: exactly the tenant's stores at most that distance away, measured on the Earth's surface, nearest first. Each has its id, name, location as a GeoJSON Point and distance from the point in metres. Over HTTP the radius is in kilometres.
- **GEO-2** Nearest stores to a depot: the tenant's `k` stores nearest to the depot's location, nearest first, shaped as in GEO-1. A depot the tenant doesn't own is not found.
- **GEO-3** Zone of a store: among the tenant's zones whose area covers the store, the highest priority wins, then the oldest, then the lowest id. The result has the zone's id, name, priority and depot id. No covering zone is not an error; over HTTP it is `{ "zone": null }`. A store the tenant doesn't own is not found.

Input limits are in `request-validation.md`, not-found responses in `tenant-scoping.md`.

## Entry points

HTTP, all requiring `X-Tenant-Id`:

- `GET /stores/within?lng&lat&radiusKm` → `StoreWithDistance[]`
- `GET /stores/nearest?depotId&k` → `StoreWithDistance[]`
- `GET /stores/:id/zone` → `StoreZoneResponse`

Repositories, which may be called directly:

```ts
// apps/api/src/stores/store.repository.ts
StoreRepository.findWithin(tenantId: string, center: GeoJsonPoint, radiusM: number): Promise<StoreWithDistance[]>
StoreRepository.findNearestToLocation(tenantId: string, location: GeoJsonPoint, k: number): Promise<StoreWithDistance[]>

// apps/api/src/zones/zone.repository.ts
ZoneRepository.findCovering(tenantId: string, location: GeoJsonPoint): Promise<StoreZone | undefined>

// apps/api/src/stores/dto/store-responses.ts
interface StoreWithDistance { id: string; name: string; location: GeoJsonPoint; distanceM: number }
interface StoreZone { id: string; name: string; priority: number; depotId: string }
interface StoreZoneResponse { zone: StoreZone | null }
```

## Fixture facts

Seeded by `DatabaseSeeder` (every test container is migrated and seeded):

- Tenants `Kyiv Distribution` and `Lviv Supply`.
- Kyiv depots: `Sviatoshyn Depot` at `[30.37, 50.46]`, `Darnytsia Depot` at `[30.66, 50.43]`.
- Kyiv zones, axis-aligned rectangles `(west, south, east, north)`, all owned by Sviatoshyn except the left-bank ones:
  - `Right Bank North` `(30.33, 50.46, 30.52, 50.52)`, priority 0
  - `Right Bank South` `(30.33, 50.36, 30.55, 50.46)`, priority 0
  - `City Centre` `(30.44, 50.42, 30.52, 50.48)`, priority 10
  - `Left Bank North` `(30.59, 50.44, 30.80, 50.50)`, priority 0, Darnytsia
  - `Left Bank South` `(30.61, 50.37, 30.77, 50.44)`, priority 0, Darnytsia
- Seeded stores are placed randomly (fixed seed); don't rely on their positions. Create stores at known points instead.
- Zone edges are geodesics, not lines of constant latitude: choose points clearly inside or outside, never on an edge.
- One degree of latitude is about 111.2 km at Kyiv's latitude.
