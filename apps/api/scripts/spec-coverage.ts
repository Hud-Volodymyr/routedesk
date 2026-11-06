import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const API_ROOT = join(import.meta.dirname, '..');
const SPECS_DIR = join(API_ROOT, '../../docs/specs');
const CONFIGS = [
  'vitest.config.ts',
  'vitest.config.int.ts',
  'vitest.config.e2e.ts',
];
const IGNORED_FILES = new Set(['database.int-spec.ts']);
const REQUIREMENT = /^- \*\*([A-Z]+-\d+)\*\*/gm;
const TITLE_ID = /^([A-Z]+-\d+): /;

interface ListedTest {
  name: string;
  file: string;
}

function requirementIds(): Map<string, string> {
  const ids = new Map<string, string>();
  for (const file of readdirSync(SPECS_DIR).filter((f) => f.endsWith('.md'))) {
    const text = readFileSync(join(SPECS_DIR, file), 'utf8');
    for (const [, id] of text.matchAll(REQUIREMENT)) if (id) ids.set(id, file);
  }
  return ids;
}

function listedTests(): ListedTest[] {
  return CONFIGS.flatMap((config) => {
    const out = execFileSync(
      'pnpm',
      ['exec', 'vitest', 'list', '--json', '--config', config],
      { cwd: API_ROOT, encoding: 'utf8' },
    );
    return JSON.parse(out) as ListedTest[];
  }).filter((test) => !IGNORED_FILES.has(basename(test.file)));
}

const ids = requirementIds();
const covered = new Set<string>();
const problems: string[] = [];

for (const test of listedTests()) {
  const title = test.name.split(' > ').at(-1) ?? test.name;
  const id = TITLE_ID.exec(title)?.[1];
  const where = `${basename(test.file)}: ${title}`;
  if (!id) problems.push(`No requirement ID: ${where}`);
  else if (!ids.has(id)) problems.push(`Unknown requirement ${id}: ${where}`);
  else covered.add(id);
}

for (const [id, file] of ids) {
  if (!covered.has(id)) problems.push(`No test for ${id} (${file})`);
}

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`All ${ids.size} requirements covered.`);
