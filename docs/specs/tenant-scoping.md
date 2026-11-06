# Tenant scoping and errors

How a request gets its tenant until Cognito arrives (milestone 2), and how missing rows become 404.

## Requirements

- **TENANT-1** Every route not marked `@Public()` requires an `X-Tenant-Id` header holding a UUID; otherwise 401. The header name is case-insensitive. Any UUID is accepted, whether or not the tenant exists. The handler receives that value as the request's tenant.
- **TENANT-2** Routes marked `@Public()`, on the controller or the handler, need no header.
- **TENANT-3** A row that isn't found, or belongs to another tenant, becomes 404 with body `{ "statusCode": 404, "message": "Not Found" }`. The response never includes the underlying error's message, which contains search conditions such as the tenant ID.

## Entry points

```ts
// apps/api/src/auth/
TenantHeaderGuard        // global guard (APP_GUARD)
@Public()                // marks a controller or handler as needing no tenant
@TenantId()              // parameter decorator: the request's tenant ID

// apps/api/src/common/errors/not-found-error.filter.ts
NotFoundErrorFilter      // global filter (APP_FILTER) for MikroORM's NotFoundError
```

## Fixture facts

- `GET /health` is the only public route.
- No protected route exists without a database; e2e tests use `apps/api/test/helpers/test-app.ts`.
