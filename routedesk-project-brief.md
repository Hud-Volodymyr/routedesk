# Project brief: RouteDesk

Paste everything below into a new Claude chat or Claude Code session.

---

## Context for you, the assistant

I'm a backend engineer (6 years of Node.js and TypeScript; NestJS, PostgreSQL, Redis, Docker, Jest, AWS ECS/S3/RDS/SQS, GCP, GitHub Actions). I want to build a portfolio project that teaches me the stack I'm missing for a Senior AWS/Node.js role at an early-stage SaaS startup: **AWS CDK, PostgreSQL with PostGIS, and Cognito**, plus infrastructure as code and CI/CD from scratch. The finished project goes on my public GitHub.

**How I want to work with you:**
- Act as a senior mentor, not a code generator. For each milestone, explain the concepts first, then give me a short task list.
- You may scaffold boilerplate (configs, DTOs, test setup). **I write the core parts myself:** CDK constructs, PostGIS queries, the Cognito auth guard, and the route-planning logic. Review my code afterwards and point out problems the way a strict code reviewer would.
- After each milestone, ask me 3–5 interview-style questions about it ("why did you choose X", "what happens if Y fails") and tell me if my answers are weak.
- Keep AWS costs near zero. Warn me before anything that costs money, never suggest a NAT Gateway without saying so, and remind me to run `cdk destroy` when I'm done.
- Never run a deploy or any command that changes my AWS account without asking me first.
- Keep a `docs/decisions.md` log with me: one short entry per real decision (what, alternatives, why, trade-off).

---

## The product

RouteDesk is a small multi-tenant SaaS for **retail distribution logistics**. A distributor (tenant) delivers goods from depots to stores. Dispatchers manage stores, delivery zones and orders, then generate daily delivery routes for their vehicles. Drivers see their own route.

It's deliberately close to the real job: a logistics product being turned into a SaaS on AWS.

### Core features
1. **Tenants and users.** Each distributor is a tenant. Roles: `admin`, `dispatcher`, `driver`. A user must never see another tenant's data.
2. **Stores and depots with locations.** CRUD with coordinates stored as PostGIS `geography(Point, 4326)`.
3. **Geo queries:**
   - Stores within N km of a point, sorted by distance
   - The nearest K stores to a depot
   - Which delivery zone a store falls in (zones are polygons)
4. **Delivery zones.** CRUD for polygons (GeoJSON in the API, PostGIS `geography(Polygon)` in the database).
5. **Orders.** An order belongs to a store, has a delivery date and a size (for vehicle capacity).
6. **Route planning (async).** A dispatcher requests routes for a date. The API returns a job id immediately; a worker builds the routes and stores them:
   - Group orders by zone, then build each vehicle's route with a nearest-neighbour heuristic under capacity limits, using PostGIS distances.
   - Store each route as an ordered list of stops plus a `LineString` and total distance.
   - Job status: `queued → running → done | failed`.
7. **Driver view.** `GET /me/route?date=` returns only the authenticated driver's route.

Perfect route optimization is **not** the goal. A simple, well-explained heuristic with clear limits is better for the portfolio.

---

## Tech stack

| Area | Choice |
|---|---|
| Runtime | Node.js 22, TypeScript (strict) |
| API | NestJS (modules, guards, interceptors, pipes) |
| Database | PostgreSQL 16 + PostGIS 3, TypeORM or raw SQL for geo queries (decide and log why) |
| Migrations | Versioned SQL migrations, run in CI before deploy |
| Auth | Amazon Cognito user pool, groups for roles, custom attribute `tenant_id`; JWT verified in the API with `aws-jwt-verify` |
| Async work | Amazon SQS queue + a worker process; dead-letter queue for failures |
| Infrastructure | AWS CDK v2 in TypeScript |
| Compute | ECS Fargate (API service + worker service) behind an Application Load Balancer |
| Secrets | AWS Secrets Manager for database credentials |
| Observability | CloudWatch Logs, a few metrics and alarms (5xx rate, DLQ depth) |
| CI/CD | GitHub Actions with OIDC to AWS (no long-lived access keys) |
| Tests | Jest + Supertest; integration tests against a real PostGIS container (Testcontainers) |
| Local dev | Docker Compose (`postgis/postgis` image, LocalStack or ElasticMQ for SQS) |
| Repo | pnpm workspaces monorepo: `apps/api`, `apps/worker`, `packages/shared`, `infra` |

**Cost notes:** RDS `db.t4g.micro` is in the free tier for new accounts; otherwise roughly $15/month. Fargate and the ALB cost a few dollars a day, so deploy, test, record what you need, then `cdk destroy`. Put Fargate tasks in public subnets with security groups instead of paying for a NAT Gateway, and keep RDS in isolated subnets. Set an AWS Budget alert on day one.

---

## Milestones

Each milestone ends with a tagged commit, passing tests, and an entry in `docs/decisions.md`.

**M0 – Repo and tooling (½ day)**
pnpm workspaces, strict TypeScript, ESLint/Prettier, Docker Compose with PostGIS, a health endpoint, GitHub Actions running lint and tests on every PR.

**M1 – Schema and migrations (1 day)**
Tables: `tenants`, `users`, `depots`, `stores`, `zones`, `vehicles`, `orders`, `route_jobs`, `routes`, `route_stops`. Geography columns, GiST indexes, `tenant_id` on every tenant-owned table. Seed script with a realistic city (e.g. 200 stores around Kyiv).

**M2 – Geo API (1 day)**
The three geo queries from the feature list. Learn `ST_DWithin`, `ST_Distance`, `ST_Contains`/`ST_Covers`, and KNN ordering with `<->`. Use `EXPLAIN ANALYZE` to prove the GiST indexes are used, and note the result in the decisions log.

**M3 – Cognito auth and multi-tenancy (1 day)**
Create the user pool by hand first to understand it, then in CDK in M5. NestJS guard that verifies the JWT, reads groups and `tenant_id`, and attaches them to the request. Every query is scoped by tenant. Write tests that prove a user from tenant A gets 404 for tenant B's resources.

**M4 – Async route planning (1–2 days)**
`POST /routes/plan` creates a job and sends an SQS message. The worker consumes it, builds routes, writes results and updates job status. Handle duplicate messages (idempotency by job id), retries, and a dead-letter queue. Add an integration test for the full flow locally.

**M5 – Infrastructure with CDK (2 days)**
Stacks for network (VPC, subnets, security groups), data (RDS PostGIS, Secrets Manager), auth (Cognito), messaging (SQS + DLQ) and app (ECS cluster, API service, worker service, ALB, log groups). Enable PostGIS through a migration. Learn `cdk synth`, `cdk diff`, `cdk deploy`, stack outputs and cross-stack references. Write at least one CDK assertion test.

**M6 – CI/CD (1 day)**
GitHub Actions: on PR run tests and `cdk diff`; on merge to `main` build images, push to ECR, run migrations, deploy. Authenticate with GitHub OIDC and a narrowly scoped IAM role.

**M7 – Observability and hardening (½–1 day)**
Structured JSON logs with request ids, CloudWatch alarms for API 5xx and DLQ depth, rate limiting on the API, input validation everywhere, least-privilege IAM for each service.

**M8 – README for reviewers (½ day)**
Architecture diagram, how to run locally in one command, how to deploy, the 3–5 most interesting decisions with rejected alternatives, known limitations, and what you'd change for production.

**Stretch goals (only if time allows)**
- A small React + MapLibre page showing stores, zones and generated routes on a map
- Replace the heuristic with a call to Amazon Location Service route calculation and compare results
- A Lambda-based variant of the worker, with a note on when Lambda beats Fargate

---

## Definition of done

- `pnpm dev` runs the whole thing locally; `pnpm test` is green.
- `cdk deploy` creates everything from an empty AWS account; `cdk destroy` removes it.
- The README explains the architecture and decisions in a way a hiring engineer can skim in two minutes.
- I can answer, without notes: why PostGIS geography vs geometry, how tenant isolation is enforced, what happens when the worker crashes mid-job, why OIDC instead of access keys, and what the main costs are.
