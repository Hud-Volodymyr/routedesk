import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import {
  startTestDatabase,
  type TestDatabase,
} from '../helpers/test-database.js';

const execFileAsync = promisify(execFile);
const apiRoot = resolve(import.meta.dirname, '../..');
const generatedFile = resolve(apiRoot, 'src/common/db/db.generated.ts');

interface CodegenConfig {
  overrides: { columns: Record<string, string> };
}

describe('Generated Kysely types (integration)', () => {
  let db: TestDatabase;
  let geographyColumns: string[];
  let overrides: Record<string, string>;

  beforeAll(async () => {
    db = await startTestDatabase();

    const rows = await db.orm.em.fork().execute<{ column: string }[]>(
      `select table_name || '.' || column_name as column
       from information_schema.columns
       where table_schema = 'public' and udt_name = 'geography'`,
    );
    geographyColumns = rows.map((row) => row.column).sort();

    const config = JSON.parse(
      await readFile(resolve(apiRoot, '.kysely-codegenrc.json'), 'utf8'),
    ) as CodegenConfig;
    overrides = config.overrides.columns;
  }, 120_000);

  afterAll(async () => {
    await db?.stop();
  });

  it('TYPES-1: the generated file matches the migrated schema', async () => {
    const before = await readFile(generatedFile, 'utf8');
    const codegen = resolve(apiRoot, 'node_modules/.bin/kysely-codegen');

    await expect(
      execFileAsync(codegen, ['--verify', '--url', db.url], { cwd: apiRoot }),
    ).resolves.toBeDefined();
    expect(await readFile(generatedFile, 'utf8')).toBe(before);
  }, 60_000);

  it('TYPES-2: types every geography column in public as Geography', () => {
    expect(geographyColumns).toContain('stores.location');
    for (const column of geographyColumns) {
      expect({ column, type: overrides[column] }).toEqual({
        column,
        type: 'Geography',
      });
    }
  });

  it('TYPES-2: overrides no column that is not geography', () => {
    for (const column of Object.keys(overrides)) {
      expect(geographyColumns).toContain(column);
    }
  });
});
