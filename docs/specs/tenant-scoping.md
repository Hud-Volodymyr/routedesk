# Tenant scoping and errors

How a request is authenticated and gets its tenant from a Cognito access token, and how missing rows become 404. Decisions 027, 045–048.

## Requirements

- **TENANT-1** Routes marked `@Public()`, on the controller or the handler, need nothing. Every other route needs an `Authorization: Bearer <token>` header (`Bearer` case-insensitive) whose token the access token verifier accepts, with a `tenant_id` claim that is a UUID in either letter case and a `cognito:groups` claim that is a non-empty list of strings. Otherwise the request is 401, and every 401 has the same response.
- **TENANT-2** For an accepted request, the handler gets the tenant from the token's `tenant_id` claim, in lower case, never from the body or other headers; and the user: `sub`, and `groups` from `cognito:groups`.
- **TENANT-3** A row that isn't found, or belongs to another tenant, becomes 404 with body `{ "statusCode": 404, "message": "Not Found" }`. The response never includes the underlying error's message, which contains search conditions such as the tenant ID.
- **TENANT-4** The access token verifier is configured from `COGNITO_USER_POOL_ID` and `COGNITO_CLIENT_IDS` (comma-separated; spaces trimmed, empty entries skipped). If either is missing or no client ID remains, creating it fails with an error naming both variables. It accepts access tokens from that user pool for the listed clients only. Signature, expiry and issuer checks belong to `aws-jwt-verify` and are not requirements here.

## Entry points

```ts
// apps/api/src/auth/
CognitoGuard             // guard; depends on Reflector and AccessTokenVerifier; canActivate is async
AccessTokenVerifier      // injectable class: verify(token) resolves to the token payload or rejects;
                         // cacheJwks(jwks) loads signing keys so no network is needed
TenantRequest            // the Express request with tenantId?: string and user?: { sub: string; groups: string[] }
@Public()                // marks a controller or handler as needing no token
@TenantId()              // parameter decorator: the request's tenant ID

// apps/api/src/common/errors/not-found-error.filter.ts
NotFoundErrorFilter      // global filter (APP_FILTER) for MikroORM's NotFoundError
```

## Fixture facts

- `GET /health` is the only public route.
- No protected route exists without a database; e2e tests use `apps/api/test/helpers/test-app.ts`.
- Tests that need an accepted token replace `AccessTokenVerifier` with a fake whose `verify` resolves to a chosen payload; no test calls Cognito.
- `createTestApp(db)` replaces `AccessTokenVerifier` with `FakeAccessTokenVerifier` from `apps/api/test/helpers/tenant.ts`. E2e requests authenticate with `authHeader(tenantId, groups = ['dispatcher'])` from the same file; the fake rejects any other token.
- A Cognito access token payload has `iss` = `https://cognito-idp.<region>.amazonaws.com/<userPoolId>`, `token_use` = `access`, `client_id`, `sub`, `exp` and `iat` (seconds since the epoch), and optionally `cognito:groups`. An ID token has `token_use` = `id` and `aud` instead of `client_id`. Tokens are RS256 JWTs whose header `kid` matches a key in the JWKS.
- The user pool ID has the form `<region>_<id>`, for example `eu-central-1_TestPool1`.
