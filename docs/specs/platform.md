# Platform checks

Checks on the app's wiring and tooling, not on a feature.

## Requirements

- **HEALTH-1** `GET /health` returns 200 with `{ "status": "ok" }`, without `X-Tenant-Id`.
- **TYPES-1** The generated Kysely types match the migrated schema exactly.
- **TYPES-2** Every `geography` column in the `public` schema is typed as `Geography`, and no override names a column that isn't `geography`.

## Entry points

- `GET /health`
- `pnpm --filter @routedesk/api db:types`, which writes `apps/api/src/common/db/db.generated.ts`; `kysely-codegen --verify` checks it without writing.
- `apps/api/.kysely-codegenrc.json`, with `overrides.columns`

## Fixture facts

- `startTestDatabase()` returns `url`, the container's connection string, for running the generator against it.
