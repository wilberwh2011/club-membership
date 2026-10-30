// npm run fixtures [-- --n <count>] [-- --seed <seed>]: writes tests/fixtures/members.synthetic.json.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateSyntheticMembers } from './synthetic.ts';

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? Number(process.argv[i + 1]) : undefined;
};

const members = generateSyntheticMembers({ n: arg('n'), seed: arg('seed') });
const out = join(dirname(fileURLToPath(import.meta.url)), 'members.synthetic.json');
writeFileSync(out, `${JSON.stringify(members, null, 2)}\n`);
process.stdout.write(`Wrote ${members.length} synthetic members to tests/fixtures/members.synthetic.json\n`);
