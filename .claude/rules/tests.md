---
paths:
  - "apps/api/test/**"
  - "**/*.spec.ts"
---

# Tests

- Integration tests: `startTestDatabase()` from `apps/api/test/helpers/test-database.ts`, once per file in `beforeAll`.
- E2e tests create the app with `createTestApp(db)` from `apps/api/test/helpers/test-app.ts`, never `Test.createTestingModule` directly.
- Fork the `EntityManager` per test.
- `em.clear()` before reloading anything you assert on.
- Read-only seed checks before tests that write.
