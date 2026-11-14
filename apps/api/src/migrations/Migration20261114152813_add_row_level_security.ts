import { Migration } from '@mikro-orm/migrations';

const APP_ROLE = 'routedesk_app';

const TENANT_TABLES = [
  'depots',
  'drivers',
  'orders',
  'route_jobs',
  'route_job_unassigned',
  'routes',
  'route_stops',
  'stores',
  'users',
  'vehicles',
  'zones',
];

const CURRENT_TENANT = `nullif(current_setting('app.tenant_id', true), '')::uuid`;

export class Migration20261114152813_add_row_level_security extends Migration {

  override name = 'Migration20261114152813_add_row_level_security';

  override async up(): Promise<void> {
    const existing = await this.execute(`select 1 from pg_roles where rolname = ?`, [APP_ROLE]);
    if (existing.length === 0) {
      this.addSql(`create role "${APP_ROLE}" login nosuperuser nocreatedb nocreaterole nobypassrls;`);
    }

    for (const table of TENANT_TABLES) {
      this.enableRls(table, 'tenant_id');
    }
    this.enableRls('tenants', 'id');

    const tables = [...TENANT_TABLES, 'tenants'].map((t) => `"${t}"`).join(', ');
    this.addSql(`grant select, insert, update, delete on ${tables} to "${APP_ROLE}";`);
  }

  override down(): void | Promise<void> {
    const tables = [...TENANT_TABLES, 'tenants'];
    this.addSql(
      `revoke select, insert, update, delete on ${tables.map((t) => `"${t}"`).join(', ')} from "${APP_ROLE}";`,
    );
    for (const table of tables) {
      this.addSql(`drop policy "tenant_isolation" on "${table}";`);
      this.addSql(`alter table "${table}" no force row level security;`);
      this.addSql(`alter table "${table}" disable row level security;`);
    }
    this.addSql(`drop role if exists "${APP_ROLE}";`);
  }

  private enableRls(table: string, column: string): void {
    this.addSql(`alter table "${table}" enable row level security;`);
    this.addSql(`alter table "${table}" force row level security;`);
    this.addSql(
      `create policy "tenant_isolation" on "${table}" using ("${column}" = ${CURRENT_TENANT}) with check ("${column}" = ${CURRENT_TENANT});`,
    );
  }

}
