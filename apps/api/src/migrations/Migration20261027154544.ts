import { Migration } from '@mikro-orm/migrations';

export class Migration20261027154544 extends Migration {

  override name = 'Migration20261027154544';

  override up(): void | Promise<void> {
    this.addSql('CREATE EXTENSION IF NOT EXISTS postgis;');
  }

  override down(): void | Promise<void> {
    this.addSql('DROP EXTENSION IF EXISTS postgis;');
  }

}
