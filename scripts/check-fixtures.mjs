// Synthetic-fixture scan (constitution Principle I; research R7, R8): tests/, scripts/ and src/server/setup.ts
// may contain only synthetic personal data:
//   - emails at example.org or example.com
//   - North American phones with exchange 555 and line 0100–0199
//   - names under name keys that are empty, start with "Test" or contain 测试
// Problems name the file, line and kind, never the value (so CI logs never show real data).
// Usage: node scripts/check-fixtures.mjs [--root <dir>]
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCAN_PATHS = ['tests', 'scripts', 'src/server/setup.ts'];
const SKIP_DIRS = new Set(['node_modules', '.git']);
const TEXT_EXTENSIONS = ['.ts', '.mts', '.cts', '.js', '.mjs', '.cjs', '.json', '.html', '.css', '.md', '.csv', '.txt', '.yml', '.yaml'];

const SYNTHETIC_EMAIL_DOMAINS = new Set(['example.org', 'example.com']);
const EMAIL = /[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)/g;
// 902-555-0123, 902.555.0123, (902) 555-0123, optionally preceded by +1 / 1.
const SEPARATED_PHONE = /(?<![\w+])(?:\+?1[-. ])?(?:\((\d{3})\)\s?|(\d{3})[-. ])(\d{3})[-. ](\d{4})(?!\w)/g;
// +19025550123
const COMPACT_PHONE = /\+1(\d{3})(\d{3})(\d{4})(?!\d)/g;
const NAME_KEYS = [
  'name_en', 'nameEn', 'name_zh', 'nameZh', 'display_name', 'displayName',
  'full_name', 'fullName', 'first_name', 'firstName', 'last_name', 'lastName',
];
const NAME_VALUE = new RegExp(`["']?\\b(?:${NAME_KEYS.join('|')})\\b["']?\\s*:\\s*(["'\`])((?:\\\\.|(?!\\1)[^\\\\])*)\\1`, 'g');

const isSyntheticPhone = (exchange, line) => exchange === '555' && /^01\d\d$/.test(line);
const isTestName = (value) => value.trim() === '' || /^Test\b/.test(value.trim()) || value.includes('测试');

function listFiles(path) {
  if (!existsSync(path)) return [];
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path).flatMap((name) => {
    if (SKIP_DIRS.has(name)) return [];
    const child = join(path, name);
    if (statSync(child).isDirectory()) return listFiles(child);
    return TEXT_EXTENSIONS.some((ext) => name.endsWith(ext)) ? [child] : [];
  });
}

function scanText(text) {
  const findings = [];
  const lineOf = (index) => text.slice(0, index).split('\n').length;

  for (const m of text.matchAll(EMAIL)) {
    if (!SYNTHETIC_EMAIL_DOMAINS.has(m[1].toLowerCase())) {
      findings.push({ line: lineOf(m.index), kind: 'email outside example.org / example.com' });
    }
  }
  for (const m of text.matchAll(SEPARATED_PHONE)) {
    if (!isSyntheticPhone(m[3], m[4])) findings.push({ line: lineOf(m.index), kind: 'phone not in 555-0100…555-0199' });
  }
  for (const m of text.matchAll(COMPACT_PHONE)) {
    if (!isSyntheticPhone(m[2], m[3])) findings.push({ line: lineOf(m.index), kind: 'phone not in 555-0100…555-0199' });
  }
  for (const m of text.matchAll(NAME_VALUE)) {
    if (!isTestName(m[2])) findings.push({ line: lineOf(m.index), kind: 'name is not a test name ("Test …" or 测试…)' });
  }
  return findings;
}

export function checkFixtures({ root = REPO_ROOT } = {}) {
  const problems = [];
  for (const scanPath of SCAN_PATHS) {
    for (const file of listFiles(join(root, scanPath))) {
      const path = relative(root, file).replace(/\\/g, '/');
      for (const { line, kind } of scanText(readFileSync(file, 'utf8'))) problems.push(`${path}:${line} ${kind}`);
    }
  }
  return problems;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const rootIndex = process.argv.indexOf('--root');
  const root = rootIndex > 0 ? resolve(process.argv[rootIndex + 1]) : REPO_ROOT;
  const problems = checkFixtures({ root });
  if (problems.length === 0) {
    process.stdout.write('Fixtures OK (synthetic data only)\n');
  } else {
    process.stderr.write(`${problems.map((p) => `✗ ${p}`).join('\n')}\n${problems.length} non-synthetic value(s)\n`);
    process.exitCode = 1;
  }
}
