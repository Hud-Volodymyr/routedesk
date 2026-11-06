---
paths:
  - 'apps/api/test/**'
  - '**/*.spec.ts'
---

# Tests

- Integration tests: `startTestDatabase()` from `apps/api/test/helpers/test-database.ts`, once per file in `beforeAll`.
- E2e tests create the app with `createTestApp(db)` from `apps/api/test/helpers/test-app.ts`, never `Test.createTestingModule` directly.
- Fork the `EntityManager` per test.
- `em.clear()` before reloading anything you assert on.
- Read-only seed checks before tests that write.
- Specs live in `docs/specs/<area>.md`: numbered requirements, entry points and fixture facts. No tiers or test cases.
- Test titles start with the requirement ID they check.
- When behaviour changes: update the spec, then run `test-writer` in maintain mode for the changed IDs.
- New or changed behaviour gets tests from the `test-writer` subagent, given a spec file. Never the implementation.
- After it returns, break each core behaviour once to prove its test fails, then restore.
- Every test traces to a requirement ID. A regression test for a fixed bug uses the ID of the requirement the bug broke. No tests of framework or library behaviour.
- One tier per case: rules and pure logic are unit; queries and database behaviour are integration; e2e covers only HTTP concerns: auth, status codes, response shape and wiring. Per endpoint: one happy path plus each error mapping.
- Write or update the spec before the code it describes, from decisions and discussion, never by reading the implementation. The user approves spec changes.
