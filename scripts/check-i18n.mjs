// Placeholder (T008 red step): accepts --root, enforces no rules yet. T009 implements the checks.
import { pathToFileURL } from 'node:url';

export function checkI18n() {
  return [];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const problems = checkI18n();
  if (problems.length === 0) process.stdout.write('Translations OK\n');
  process.exit(problems.length === 0 ? 0 : 1);
}
