import { Migration } from '@mikro-orm/migrations';

export class Migration20261028115117_add_stores_location_gist_index extends Migration {

  override name = 'Migration20261028115117_add_stores_location_gist_index';

  override up(): void | Promise<void> {
    this.addSql(`create index "stores_location_gix" on "stores" using gist ("location");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop index "stores_location_gix";`);
  }

}
