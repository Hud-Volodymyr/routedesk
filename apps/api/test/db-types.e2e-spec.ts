import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import {
  startTestDatabase,
  type TestDatabase,
} from './helpers/test-database.js';

const execFileAsync = promisify(execFile);
const apiRoot = resolve(import.meta.dirname, '..');

interface CodegenConfig {
  overrides: { columns: Record<string, string> };
}

describe('Generated Kysely types (integration)', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await startTestDatabase();
  }, 120_000);

  afterAll(async () => {
    await db?.stop();
  });

  it('match the migrated schema', async () => {
    const codegen = resolve(apiRoot, 'node_modules/.bin/kysely-codegen');

    await expect(
      execFileAsync(codegen, ['--verify', '--url', db.url], { cwd: apiRoot }),
    ).resolves.toBeDefined();
  });

  it('type every geography column as Geography', async () => {
    const config = JSON.parse(
      await readFile(resolve(apiRoot, '.kysely-codegenrc.json'), 'utf8'),
    ) as CodegenConfig;
    const rows = await db.orm.em.fork().execute<{ column: string }[]>(
      `select table_name || '.' || column_name as column
       from information_schema.columns
       where table_schema = 'public' and udt_name = 'geography'`,
    );

    const overridden = Object.entries(config.overrides.columns)
      .filter(([, type]) => type === 'Geography')
      .map(([column]) => column);

    expect(overridden.sort()).toEqual(rows.map((row) => row.column).sort());
  });
});
