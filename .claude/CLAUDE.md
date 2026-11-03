# RouteDesk

Multi-tenant logistics SaaS backend on AWS. Product and architecture: `README.md`.

## Stack

- Node 24, TypeScript 6 strict, ESM (`NodeNext`)
- NestJS 12, MikroORM 7, PostgreSQL 16 + PostGIS 3
- Vitest, Supertest, Testcontainers
- pnpm workspaces: `apps/api`, `apps/worker`, `packages/shared`, `infra`
- oxlint (type-aware), Prettier

## Commands

- `pnpm dev` — PostGIS + API
- `pnpm lint`, `pnpm -r build`
- `pnpm --filter @routedesk/api test` — unit
- `pnpm --filter @routedesk/api test:e2e` — integration, needs Docker
- `pnpm --filter @routedesk/api orm <cmd>` — MikroORM CLI
- `pnpm seed` — reset local data

## Conventions

- English everywhere.
- No code comments from Claude. If one seems necessary, suggest it in chat with file, line and text; I decide.
- Relative imports end in `.js`. Type-only imports use `import type`.
- pnpm only; `pnpm dlx`, not `npx`.
- Code shared by API and worker goes in `packages/shared`.
- Coordinates: GeoJSON `[lng, lat]`, SRID 4326.
- Schema changes only through migrations. Never run `orm schema:*`.
- Kysely queries: `em.getKysely<DB>()` with `DB` from `apps/api/src/common/db/db.generated.ts`. Never edit the generated file.


## Tenant isolation

- Tenant comes from the verified JWT (temporarily: `X-Tenant-Id` header), never from the body.
- Every query filters by tenant, including raw Kysely queries.
- Load related rows through the `EntityManager`; never `em.getReference()` by bare ID. Foreign keys don't check tenants.
- One forked `EntityManager` per request, SQS message, and test.
- Inject `EntityManager` from `@mikro-orm/postgresql`.

## Permissions

`.claude/` is read-only for you. When a new command or tool comes up, suggest a rule for `.claude/settings.json` in chat:

- `allow`: read-only or local, repeatable commands I keep approving (lint, build, tests, inspection).
- `ask`: commands that change state — database, Docker, git remotes, installs.
- `deny`: anything that touches AWS accounts, secrets, production data, or rewrites history.

Format: the exact rule, the list it goes in, one-line reason. Never suggest loosening an existing `deny` or `ask` rule.

## Instruction upkeep

Suggest changes to `.claude/CLAUDE.md` or `.claude/rules/` in chat, as a diff, when:

- I correct the same thing twice → propose a rule.
- Work starts in an area no rule covers (e.g. `infra/`, `apps/worker/`) → propose a rule file with `paths`.
- A rule only matters for some files → propose moving it to a path-scoped rule.
- `CLAUDE.md` passes ~150 lines or a rule file ~100 → propose a split.
- A rule is outdated or contradicts the code or another rule → flag it.

Tables of contents only for long reference files read on demand, not for rules.

## Git

- One branch per milestone or feature, from an up-to-date `main`: `feat/…`, `chore/…`, `fix/…`. Merge through a PR with CI green. Never commit to `main`.
- At the start of a milestone, Claude proposes the branch before any change.
- Commit each finished step before starting the next. Dependency changes get their own commit.
