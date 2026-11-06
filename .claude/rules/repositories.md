---
paths:
  - 'apps/api/src/**/*.repository.ts'
  - 'apps/api/src/**/*.service.ts'
  - 'apps/api/src/**/*.entity.ts'
---

# Repositories

- Database access, including Kysely, lives in `<entity>.repository.ts` (`extends EntityRepository<T>` from `@mikro-orm/postgresql`). Services never call `getKysely()`.
- Link it from the entity: `repository: () => XRepository` and `[EntityRepositoryType]?: XRepository`. Register with `MikroOrmModule.forFeature([X])`.
- Use `findOneOrFail` for lookups that must exist; the global filter turns `NotFoundError` into 404.
