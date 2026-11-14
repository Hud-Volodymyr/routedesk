# Platform checks

Checks on the app's wiring and tooling, not on a feature.

## Requirements

- **HEALTH-1** `GET /health` returns 200 with `{ "status": "ok" }`, without an `Authorization` header.
- **TYPES-1** The generated Kysely types match the migrated schema exactly.
- **TYPES-2** Every `geography` column in the `public` schema is typed as `Geography`, and no override names a column that isn't `geography`.
- **TYPES-3** Our entity mappings give back what was saved: the custom geography types (`PointType`, `LineStringType`, `PolygonType`) return a GeoJSON value equal to the one saved, and a changed value is saved on `flush()`.
- **TYPES-4** The migrated schema matches the entity definitions: generating a migration from the entities against the migrated database produces no changes.
- **SEED-1** The seed has two tenants: Kyiv Distribution with 200 stores and Lviv Supply with 15, and at least one order heavier than any of its tenant's vehicles can carry.

## Entry points

- `GET /health`
- `pnpm --filter @routedesk/api db:types`, which writes `apps/api/src/common/db/db.generated.ts`; `kysely-codegen --verify` checks it without writing.
- `apps/api/.kysely-codegenrc.json`, with `overrides.columns`

## Fixture facts

- `startTestDatabase()` returns `url`, the container's connection string, for running the generator against it.
