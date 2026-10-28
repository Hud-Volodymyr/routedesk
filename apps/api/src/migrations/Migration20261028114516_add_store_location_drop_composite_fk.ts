import { Migration } from '@mikro-orm/migrations';

export class Migration20261028114516_add_store_location_drop_composite_fk extends Migration {

  override name = 'Migration20261028114516_add_store_location_drop_composite_fk';

  override up(): void | Promise<void> {
    this.addSql(`alter table "orders" drop constraint "orders_tenant_store_fk";`);
    this.addSql(`alter table "stores" drop constraint "stores_tenant_id_id_unique";`);
    this.addSql(`alter table "stores" add "location" geography(Point, 4326) not null;`);
    this.addSql(`alter table "orders" drop constraint "orders_tenant_id_id_unique";`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "orders" add constraint "orders_tenant_id_id_unique" unique ("tenant_id", "id");`);
    this.addSql(`alter table "stores" drop column "location";`);
    this.addSql(`alter table "stores" add constraint "stores_tenant_id_id_unique" unique ("tenant_id", "id");`);
    this.addSql(`alter table "orders" add constraint "orders_tenant_store_fk" foreign key ("tenant_id", "store_id") references "stores" ("tenant_id", "id") on update no action on delete no action;`);
  }

}
