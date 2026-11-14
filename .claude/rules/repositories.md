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
- Writes happen inside a `@Transactional()` method; MikroORM flushes when it commits. Don't call `em.flush()`: what gets saved is exactly what that method created or changed.
- Prefer `em.create()` and changes to loaded entities, saved on commit. Use `em.insert()` only for a single row where change tracking adds nothing.
