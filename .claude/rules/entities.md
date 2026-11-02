---
paths:
  - "apps/api/src/**/*.entity.ts"
  - "apps/api/src/common/geo/**"
---

# Entities

- Decorators from `@mikro-orm/decorators/legacy`.
- Every property sets its type explicitly; no reliance on decorator metadata.
- Tenant-owned entities have a `tenant` relation. Foreign keys are single-column.
- Nullable fields and relations set `nullable: true`.
- Fields with DB defaults are typed `Opt<T>`.
- Timestamps: `type: 'datetime', columnType: 'timestamptz', defaultRaw: 'now()'`; `updatedAt` adds `onUpdate`.
- Geography columns use `PointType`, `LineStringType` or `PolygonType` from `common/geo/geography.type.ts`.
- Name every `@Check`; unnamed checks on one table collide.
- GiST index: `@Index({ name: '<table>_<column>_gix', properties: [...], type: 'gist' })`.
- Partial unique index: `@Index({ name, expression: 'create unique index ... where ...' })`.
- Register new entities in `mikro-orm.config.ts`.
