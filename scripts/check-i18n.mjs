// Translation check (FR-020, FR-021, SC-004, constitution Principle III; research R8 item 4):
//   - en.json and zh-Hans.json have the same keys and no empty values
//   - every {placeholder} appears in both languages
//   - every t('key') used in src/ui, src/application and src/server exists
//   - every term.* value equals the English / Chinese column of docs/brief/glossary.md
// Usage: node scripts/check-i18n.mjs [--root <dir>]
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LOCALES = ['en', 'zh-Hans'];
const SOURCE_DIRS = ['src/ui', 'src/application', 'src/server'];
const SOURCE_EXTENSIONS = ['.ts', '.mjs', '.js', '.html'];
const T_CALL = /\bt\(\s*(['"`])([A-Za-z0-9_.-]+)\1/g;
const PLACEHOLDER = /\{(\w+)\}/g;

function loadLocale(root, locale, problems) {
  const file = join(root, 'src', 'i18n', `${locale}.json`);
  if (!existsSync(file)) {
    problems.push(`Missing translation file src/i18n/${locale}.json`);
    return {};
  }
  const data = JSON.parse(readFileSync(file, 'utf8'));
  for (const [key, value] of Object.entries(data)) {
    if (typeof value !== 'string') problems.push(`Value for '${key}' in ${locale} is not a string`);
  }
  return data;
}

function placeholders(value) {
  return [...String(value).matchAll(PLACEHOLDER)].map((m) => m[1]).sort();
}

function listFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return listFiles(path);
    return SOURCE_EXTENSIONS.some((ext) => name.endsWith(ext)) ? [path] : [];
  });
}

const stripParenthetical = (text) => text.replace(/\s*[(（][^)）]*[)）]\s*/g, ' ').trim();

// "EC (Executive Committee) member" -> "ecMember"; "Delete (member record)" -> "delete".
export function termKey(english) {
  const words = stripParenthetical(english.split(' / ')[0]).split(/[^A-Za-z0-9]+/).filter(Boolean);
  return words.map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase())).join('');
}

// Accepted spellings of a glossary cell: the cell, each " / " alternative, each without its parenthetical.
function alternatives(cell) {
  const parts = [cell, ...cell.split('/')].map((s) => s.trim());
  return new Set([...parts, ...parts.map(stripParenthetical)].filter(Boolean));
}

function parseGlossary(root, problems) {
  const file = join(root, 'docs', 'brief', 'glossary.md');
  if (!existsSync(file)) {
    problems.push('Missing docs/brief/glossary.md');
    return new Map();
  }
  const terms = new Map();
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length < 2 || /^-+$/.test(cells[0]) || cells[0] === 'English') continue;
    terms.set(termKey(cells[0]), { en: cells[0], zh: cells[1] });
  }
  return terms;
}

const sameEnglish = (a, b) => a.toLowerCase() === b.toLowerCase();

export function checkI18n({ root = REPO_ROOT } = {}) {
  const problems = [];
  const [en, zh] = LOCALES.map((locale) => loadLocale(root, locale, problems));
  const byLocale = { en, 'zh-Hans': zh };

  for (const [locale, other] of [['en', 'zh-Hans'], ['zh-Hans', 'en']]) {
    for (const key of Object.keys(byLocale[locale])) {
      if (!(key in byLocale[other])) problems.push(`Key '${key}' is in ${locale} but missing in ${other}`);
    }
  }

  for (const locale of LOCALES) {
    for (const [key, value] of Object.entries(byLocale[locale])) {
      if (String(value).trim() === '') problems.push(`Empty value for '${key}' in ${locale}`);
    }
  }

  for (const key of Object.keys(en)) {
    if (!(key in zh)) continue;
    const [a, b] = [placeholders(en[key]), placeholders(zh[key])];
    if (a.join(',') !== b.join(',')) {
      problems.push(`Placeholder mismatch for '${key}': en {${a.join('},{')}} vs zh-Hans {${b.join('},{')}}`);
    }
  }

  for (const dir of SOURCE_DIRS) {
    for (const file of listFiles(join(root, dir))) {
      const source = readFileSync(file, 'utf8');
      for (const [, , key] of source.matchAll(T_CALL)) {
        if (!(key in en) || !(key in zh)) {
          problems.push(`Key '${key}' used in ${relative(root, file).replace(/\\/g, '/')} is missing from the translations`);
        }
      }
    }
  }

  const glossary = parseGlossary(root, problems);
  const termKeys = new Set([...Object.keys(en), ...Object.keys(zh)].filter((k) => k.startsWith('term.')));
  for (const key of termKeys) {
    const entry = glossary.get(key.slice('term.'.length));
    if (!entry) {
      problems.push(`Term '${key}' has no row in docs/brief/glossary.md`);
      continue;
    }
    if (key in en && ![...alternatives(entry.en)].some((alt) => sameEnglish(alt, en[key]))) {
      problems.push(`Term '${key}' in en is '${en[key]}' but the glossary says '${entry.en}'`);
    }
    if (key in zh && !alternatives(entry.zh).has(zh[key])) {
      problems.push(`Term '${key}' in zh-Hans is '${zh[key]}' but the glossary says '${entry.zh}'`);
    }
  }

  return problems;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const rootIndex = process.argv.indexOf('--root');
  const root = rootIndex > 0 ? resolve(process.argv[rootIndex + 1]) : REPO_ROOT;
  const problems = checkI18n({ root });
  if (problems.length === 0) {
    process.stdout.write('Translations OK\n');
  } else {
    process.stderr.write(`${problems.map((p) => `✗ ${p}`).join('\n')}\n${problems.length} translation problem(s)\n`);
    process.exitCode = 1;
  }
}
