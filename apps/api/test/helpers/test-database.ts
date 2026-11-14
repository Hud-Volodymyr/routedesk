import { MikroORM, type EntityManager } from '@mikro-orm/postgresql';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import config from '../../src/mikro-orm.config.js';
import { setAppRolePassword } from '../../scripts/app-role.js';
import { DatabaseSeeder } from '../../src/seeders/DatabaseSeeder.js';

function initOrm(clientUrl: string) {
  return MikroORM.init({
    ...config,
    clientUrl,
    preferTs: true,
    debug: false,
  });
}

export type TestOrm = Awaited<ReturnType<typeof initOrm>>;

export interface TestDatabase {
  orm: TestOrm;
  ownerOrm: TestOrm;
  url: string;
  stop(): Promise<void>;
}

export async function startTestDatabase(): Promise<TestDatabase> {
  const appPassword = process.env.APP_DB_PASSWORD;
  if (!appPassword) {
    throw new Error('APP_DB_PASSWORD must be set to run database tests');
  }

  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer(
    'postgis/postgis:16-3.4',
  ).start();

  const url = container.getConnectionUri();
  const ownerOrm = await initOrm(url);

  await ownerOrm.migrator.up();
  await ownerOrm.seeder.seed(DatabaseSeeder);
  await setAppRolePassword(ownerOrm.em.fork(), appPassword);

  const appUrl = new URL(url);
  appUrl.username = 'routedesk_app';
  appUrl.password = appPassword;
  const orm = await initOrm(appUrl.toString());

  return {
    orm,
    ownerOrm,
    url,
    async stop() {
      await orm.close(true);
      await ownerOrm.close(true);
      await container.stop();
    },
  };
}

export function inTenant<T>(
  orm: TestOrm,
  tenantId: string,
  work: (em: EntityManager) => Promise<T>,
): Promise<T> {
  const em = orm.em.fork();
  em.setSessionContext({ variables: { 'app.tenant_id': tenantId } });
  return em.transactional((tx) => work(tx as EntityManager));
}
