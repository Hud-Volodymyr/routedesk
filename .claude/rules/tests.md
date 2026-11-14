---
paths:
  - 'apps/api/test/**'
  - '**/*.spec.ts'
---

# Tests

- Integration tests: `startTestDatabase()` from `apps/api/test/helpers/test-database.ts`, once per file in `beforeAll`.
- E2e tests create the app with `createTestApp(db)` from `apps/api/test/helpers/test-app.ts`, never `Test.createTestingModule` directly.
- Setup used by more than one test file (request contexts, token payloads, status helpers, etc) lives in `apps/api/test/helpers/`. Check there before writing a local helper.
- Fork the `EntityManager` per test.
- `em.clear()` before reloading anything you assert on.
- Read-only seed checks before tests that write.
- Specs live in `docs/specs/<area>.md`: numbered requirements, entry points and fixture facts. No tiers or test cases.
- Write each requirement as one rule, not a list of examples. Every example in a requirement turns into a test.
- When a library does a check for us (signatures, expiry, validation), the requirement says what we give the library, not what the library checks.
- Test titles start with the requirement ID they check.
- When behaviour changes: update the spec, then run `test-writer` in maintain mode for the changed IDs.
- New or changed behaviour gets tests from the `test-writer` subagent, given a spec file. Never the implementation.
- After `test-writer` returns, mutation-test by hand: for each requirement in scope, make one small change to the code under test that breaks what the requirement says, run the tests, restore the file and confirm it is unchanged. Repeat for each behaviour, including the wrong-source and wrong-default cases the requirement rules out.
- A change no test catches, or a test no change breaks, goes back to `test-writer` in maintain mode, described as behaviour ("a tenant from the request body is accepted"), never as code. Repeat until every change is caught and every test fails for at least one change, or the user accepts the gap.
- Report to the user: each change, the tests that caught it, and any accepted gap.
- Every test traces to a requirement ID. A regression test for a fixed bug uses the ID of the requirement the bug broke. No tests of framework or library behaviour.
- One tier per case: rules and pure logic are unit; queries and database behaviour are integration; e2e covers only HTTP concerns: auth, status codes, response shape and wiring. Per endpoint: one happy path plus each error mapping.
- Write or update the spec before the code it describes, from decisions and discussion, never by reading the implementation. The user approves spec changes.
