# Roles

Which signed-in users may call a route, from the Cognito groups in their access token. Decisions 012, 027, 049.

## Requirements

- **ROLE-1** A route not marked `@Public()` is allowed only when the user's groups include at least one role listed by `@Roles(...)`; a handler's `@Roles` replaces its controller's. A route with no `@Roles` on either is denied for everyone. A denied request is 403, and every 403 has the same response.
- **ROLE-2** The store endpoints (`/stores/*`) allow the roles `admin` and `dispatcher`.

## Entry points

```ts
// apps/api/src/auth/
Role                     // 'admin' | 'dispatcher' | 'driver'
@Roles(...roles: [Role, ...Role[]]) // on a controller or a handler; an empty @Roles() does not compile
RolesGuard               // guard; depends on Reflector; runs after CognitoGuard, which sets request.user
```

## Fixture facts

- `request.user.groups` is a non-empty list of strings, set by `CognitoGuard` (`tenant-scoping.md`). Groups that are not a `Role` match nothing.
- E2e requests choose the user's groups with `authHeader(tenantId, groups)` from `apps/api/test/helpers/tenant.ts`; the default is `['dispatcher']`.
