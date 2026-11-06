# Request validation

How request input is checked before it reaches a handler.

## Requirements

- **VALID-1** Invalid query input gets 400 with body `{ "message": "Validation failed", "issues": [{ "path", "message" }] }`; `path` is the parameter name, dot-joined when nested. An invalid path ID gets 400 in Nest's default shape. Valid input reaches the handler converted, with defaults applied.
- **VALID-2** Unknown query parameters are rejected, including `tenantId`.
- **VALID-3** Numeric query parameters arrive as strings and are converted; empty, non-numeric or repeated values are rejected.
- **VALID-4** Each endpoint enforces its limits:
  - `GET /stores/within`: `lng` from -180 to 180, `lat` from -90 to 90, `radiusKm` above 0 and at most 100; all required.
  - `GET /stores/nearest`: `depotId` required, a UUID; `k` a whole number from 1 to 50, 10 when missing.
  - `GET /stores/:id/zone`: `:id` a UUID.

## Entry points

```ts
// apps/api/src/common/validation/zod-validation.pipe.ts
new ZodValidationPipe(schema); // used as @Query(new ZodValidationPipe(schema))

// apps/api/src/stores/dto/
storesWithinQuery; // Zod schema for GET /stores/within
nearestStoresQuery; // Zod schema for GET /stores/nearest
```

Path IDs use Nest's `ParseUUIDPipe`. The HTTP routes are listed in `geo-queries.md`.
