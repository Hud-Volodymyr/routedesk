import {
  MikroORM,
  type EntityManager,
  type GetKyselyOptions,
} from '@mikro-orm/postgresql';
import type { GeoJsonPoint } from '@routedesk/shared';
import {
  CompiledQuery,
  type Kysely,
  type KyselyPlugin,
  type PluginTransformQueryArgs,
  type PluginTransformResultArgs,
  type QueryResult,
  type RootOperationNode,
  type UnknownRow,
} from 'kysely';
import type { DB } from '../src/common/db/db.generated.js';
import { Depot } from '../src/depots/depot.entity.js';
import config from '../src/mikro-orm.config.js';
import { Store } from '../src/stores/store.entity.js';
import { Tenant } from '../src/tenants/tenant.entity.js';
import { Zone } from '../src/zones/zone.entity.js';

const KYIV_CENTRE: GeoJsonPoint = {
  type: 'Point',
  coordinates: [30.52, 50.45],
};
const CITY_CENTRE_POINT: GeoJsonPoint = {
  type: 'Point',
  coordinates: [30.48, 50.44],
};

class CapturePlugin implements KyselyPlugin {
  readonly queries: CompiledQuery[] = [];

  constructor(private readonly db: Kysely<DB>) {}

  transformQuery({
    node,
    queryId,
  }: PluginTransformQueryArgs): RootOperationNode {
    this.queries.push(this.db.getExecutor().compileQuery(node, queryId));
    return node;
  }

  transformResult({
    result,
  }: PluginTransformResultArgs): Promise<QueryResult<UnknownRow>> {
    return Promise.resolve(result);
  }
}

async function explain(db: Kysely<DB>, query: CompiledQuery): Promise<string> {
  const explained = CompiledQuery.raw(
    `EXPLAIN (ANALYZE, BUFFERS) ${query.sql}`,
    [...query.parameters],
  );
  await db.executeQuery(explained);
  const { rows } = await db.executeQuery<{ 'QUERY PLAN': string }>(explained);
  return rows.map((row) => row['QUERY PLAN']).join('\n');
}

async function capture(
  em: EntityManager,
  run: () => Promise<unknown>,
): Promise<CompiledQuery[]> {
  const getKysely = em.getKysely.bind(em);
  const plugin = new CapturePlugin(getKysely<DB>());
  em.getKysely = ((options?: GetKyselyOptions) =>
    getKysely(options).withPlugin(plugin)) as typeof em.getKysely;
  try {
    await run();
  } finally {
    em.getKysely = getKysely;
  }
  return plugin.queries;
}

interface Case {
  name: string;
  method: string;
  run: () => Promise<unknown>;
}

function repositoryMethods(orm: MikroORM): string[] {
  const repositories = new Set(
    [...orm.getMetadata()].flatMap((meta) => {
      const repository = meta.repository as typeof meta.repository | undefined;
      return repository ? [repository()] : [];
    }),
  );
  return [...repositories].flatMap((repository) =>
    Object.getOwnPropertyNames(repository.prototype)
      .filter((name) => name !== 'constructor')
      .map((name) => `${repository.name}.${name}`),
  );
}

const orm = await MikroORM.init({ ...config, debug: false });

try {
  await orm.em.fork().transactional(async (em) => {
    await em.execute('set transaction read only');

    const kyiv = await em.findOneOrFail(Tenant, { name: 'Kyiv Distribution' });
    const darnytsia = await em.findOneOrFail(Depot, {
      tenant: kyiv,
      name: 'Darnytsia Depot',
    });
    const stores = em.getRepository(Store);
    const zones = em.getRepository(Zone);

    const cases: Case[] = [
      {
        name: 'stores within 5 km of Kyiv centre',
        method: 'StoreRepository.findWithin',
        run: () => stores.findWithin(kyiv.id, KYIV_CENTRE, 5_000),
      },
      {
        name: 'stores within 50 km of Kyiv centre',
        method: 'StoreRepository.findWithin',
        run: () => stores.findWithin(kyiv.id, KYIV_CENTRE, 50_000),
      },
      {
        name: '10 stores nearest Darnytsia Depot',
        method: 'StoreRepository.findNearestToLocation',
        run: () =>
          stores.findNearestToLocation(kyiv.id, darnytsia.location, 10),
      },
      {
        name: 'zone covering a City Centre point',
        method: 'ZoneRepository.findCovering',
        run: () => zones.findCovering(kyiv.id, CITY_CENTRE_POINT),
      },
    ];

    const missing = repositoryMethods(orm).filter(
      (method) => !cases.some((c) => c.method === method),
    );
    if (missing.length > 0) {
      throw new Error(
        `Repository methods without a case: ${missing.join(', ')}`,
      );
    }

    const db = em.getKysely<DB>();
    for (const { name, run } of cases) {
      for (const query of await capture(em, run)) {
        console.log(
          `\n=== ${name}\n${query.sql}\n${JSON.stringify(query.parameters)}\n`,
        );
        console.log(await explain(db, query));
      }
    }
  });
} finally {
  await orm.close(true);
}
