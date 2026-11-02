---
paths:
  - "apps/api/src/migrations/**"
  - "apps/api/src/mikro-orm.config.ts"
---

# Migrations

- Always name: `orm migration:create --name=<what_it_does>`.
- Generated migrations are drafts. Check `down` reverses `up` in dependency order.
- Verify with `migration:up`, `migration:down`, `migration:up`.
- Never edit or rename a migration that ran outside the local database.
- Deleting an unrun migration also requires deleting `src/migrations/.snapshot-*.json`.
