# Users

Creating a user of the admin's tenant in Cognito and Postgres in one request. Decisions 012, 045, 049, 059.

## Requirements

- **USER-1** `POST /users` takes `email`, `name` and `role` (`admin`, `dispatcher` or `driver`), and `phone` for drivers only. It creates, in the caller's tenant: a Cognito user with that email and `custom:tenant_id` set to the caller's tenant, a `users` row with the Cognito `sub`, a `drivers` row for drivers, membership of the Cognito group named by `role`, and an invitation sent last. It responds 201 with `{ id, email, name, role }`. The tenant never comes from the body.
- **USER-2** If a step fails, the response is an error and the user can't use the API yet: either it has no group, or only the invitation is missing, so it has no password it knows. Repeating the same request completes the missing steps without duplicate rows or groups, sends the invitation, and responds as in USER-1.
- **USER-3** An email that belongs to a user of another tenant, to a user who has already signed in, or to a user in a group other than the requested role, is 409 with the same body in every case. Nothing about that user changes.
- **USER-4** Invalid bodies are 400 in the shape of VALID-1 (`request-validation.md`): `email` must be an email, `name` non-empty, `role` one of the three roles, `phone` required for drivers and rejected otherwise, unknown fields rejected.

- **USER-5** The operator script `create-admin` makes the given email an admin of the given existing tenant, and can be run again with the same arguments. It creates the Cognito user with that tenant or reuses one already in that tenant, ensures the `users` row (named as given), adds the `admin` group if missing, and sends an invitation only when it created the Cognito user. An unknown tenant, or an email belonging to another tenant, is an error and changes nothing.

Allowed roles are in `roles.md`.

## Entry points

```ts
POST / users; // @Roles('admin')

// apps/api/src/users/
CognitoUsers; // injectable class wrapping the AWS SDK:
//   findByEmail(email) → { sub, tenantId, groups, signedIn } | null
//   create(email, tenantId) → { sub }      (invitation suppressed)
//   addToGroup(sub, group)
//   sendInvitation(email)
```

## Fixture facts

- `createTestApp(db, cognito?)` replaces `CognitoUsers` with a `FakeCognitoUsers` (`apps/api/test/helpers/fake-cognito-users.ts`), a new one unless passed. It keeps users in `users` (by email: `sub`, `tenantId`, `groups`, `signedIn`, `invitations` count); `add(record)` seeds one; `failOnce(method)` makes the next call of that method throw.
- `users` and `drivers` are tenant-owned; their rows are checked through `ownerOrm`.
- USER-5 is tested through `UsersService.ensureAdmin(tenantId, email, name)` in a Nest testing module with `CognitoUsers` replaced by `FakeCognitoUsers`, inside a `RequestContext` whose EntityManager has the tenant set in its session context. No test runs the script or calls AWS.
