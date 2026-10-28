import { Migration } from '@mikro-orm/migrations';

export class Migration20261028105157_add_orders_table extends Migration {

  override name = 'Migration20261028105157_add_orders_table';

  override up(): void | Promise<void> {
    this.addSql(`create table "orders" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "store_id" uuid not null, "delivery_date" date not null, "size" int not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), primary key ("id"));`);
    this.addSql(`create index "orders_tenant_id_store_id_index" on "orders" ("tenant_id", "store_id");`);
    this.addSql(`create index "orders_tenant_id_delivery_date_index" on "orders" ("tenant_id", "delivery_date");`);
    this.addSql(`alter table "orders" add constraint "orders_tenant_id_id_unique" unique ("tenant_id", "id");`);

    this.addSql(`alter table "orders" add constraint "orders_tenant_id_foreign" foreign key ("tenant_id") references "tenants" ("id");`);
    this.addSql(`alter table "orders" add constraint "orders_store_id_foreign" foreign key ("store_id") references "stores" ("id");`);
    this.addSql(`alter table "orders" add constraint "orders_check" check (size > 0);`);
    this.addSql(
      'alter table "orders" add constraint "orders_tenant_store_fk" foreign key ("tenant_id", "store_id") references "stores" ("tenant_id", "id");',
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "orders" cascade;`);
  }

}
