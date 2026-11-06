---
paths:
  - 'apps/api/src/**/*.repository.ts'
  - 'apps/api/src/common/geo/**'
  - 'apps/api/src/migrations/**'
---

# Query plans

- After adding or changing a query or an index, run `pnpm --filter @routedesk/api db:explain` against the seeded dev database and read the plans before committing.
- Every repository query has a case in `apps/api/scripts/explain.ts`.
- Check each plan:
  - Spatial filters: `&&` in `Index Cond` on a `_gix` index; the exact check (`st_dwithin`, `st_covers`) in `Filter`.
  - KNN: `Index Scan` with `Order By: (… <-> …)` under `Limit`, no `Sort`. The point must be a constant; for a point from another table, use `LATERAL`.
  - `Rows Removed by Filter`, and estimated vs actual rows.
  - `Seq Scan` is expected only when most rows match.
- `db:explain` is read-only and can't refresh statistics: after a seed or migration, ask before running `ANALYZE`.
