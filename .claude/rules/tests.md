---
paths:
  - "apps/api/test/**"
  - "**/*.spec.ts"
---

# Tests

- Integration tests: `startTestDatabase()` from `apps/api/test/test-database.ts`, once per file in `beforeAll`.
- Fork the `EntityManager` per test.
- `em.clear()` before reloading anything you assert on.
- Read-only seed checks before tests that write.
