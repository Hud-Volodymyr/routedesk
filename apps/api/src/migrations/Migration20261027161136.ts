import { Migration } from '@mikro-orm/migrations';

export class Migration20261027161136 extends Migration {

  override name = 'Migration20261027161136';

  override up(): void | Promise<void> {
    this.addSql(`create table "tenants" ("id" uuid not null default gen_random_uuid(), "name" text not null, "created_at" timestamptz not null default now(), primary key ("id"));`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "tenants" cascade;`);
  }

}
