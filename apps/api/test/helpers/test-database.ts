import { MikroORM } from '@mikro-orm/postgresql';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import config from '../../src/mikro-orm.config.js';
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
  url: string;
  stop(): Promise<void>;
}

export async function startTestDatabase(): Promise<TestDatabase> {
  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer(
    'postgis/postgis:16-3.4',
  ).start();

  const url = container.getConnectionUri();
  const orm = await initOrm(url);

  await orm.migrator.up();
  await orm.seeder.seed(DatabaseSeeder);

  return {
    orm,
    url,
    async stop() {
      await orm.close(true);
      await container.stop();
    },
  };
}
