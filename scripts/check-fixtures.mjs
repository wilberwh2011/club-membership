// Placeholder (T012 red step): accepts --root, enforces no rules yet. T013 implements the scan.
import { pathToFileURL } from 'node:url';

export function checkFixtures() {
  return [];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const problems = checkFixtures();
  if (problems.length === 0) process.stdout.write('Fixtures OK\n');
  process.exit(problems.length === 0 ? 0 : 1);
}
