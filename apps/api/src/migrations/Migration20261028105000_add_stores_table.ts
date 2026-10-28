import { Migration } from '@mikro-orm/migrations';

export class Migration20261028105000_add_stores_table extends Migration {

  override name = 'Migration20261028105000_add_stores_table';

  override up(): void | Promise<void> {
    this.addSql(`create table "stores" ("id" uuid not null default gen_random_uuid(), "name" text not null, "address" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "tenant_id" uuid not null, primary key ("id"));`);
    this.addSql(`alter table "stores" add constraint "stores_tenant_id_id_unique" unique ("tenant_id", "id");`);

    this.addSql(`alter table "stores" add constraint "stores_tenant_id_foreign" foreign key ("tenant_id") references "tenants" ("id");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "stores" cascade;`);
  }

}
