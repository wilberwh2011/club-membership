// Translation check (scripts/check-i18n.mjs): FR-020, FR-021, SC-004, constitution Principle III.
// Each test builds a small synthetic project in a temp folder and runs the CLI against it.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const SCRIPT = resolve(__dirname, '../../scripts/check-i18n.mjs');

const GLOSSARY = [
  '# Glossary',
  '',
  '| English | 中文 | Meaning |',
  '|---|---|---|',
  '| Member | 会员 | A person registered with the Club |',
  '| Member number | 会员编号 | The unique number |',
  '| EC (Executive Committee) member | 理事 / 执委 | A Club role |',
  '| Delete (member record) | 删除（会员记录） | Admin-only removal |',
  '',
].join('\n');

type Translations = Record<string, string>;

const EN: Translations = {
  'term.member': 'Member',
  'term.memberNumber': 'Member number',
  'term.ecMember': 'EC member',
  'term.delete': 'Delete',
  'search.results': '{n} results',
};
const ZH: Translations = {
  'term.member': '会员',
  'term.memberNumber': '会员编号',
  'term.ecMember': '理事',
  'term.delete': '删除',
  'search.results': '{n} 条结果',
};
const UI_SOURCE = "export const label = (t: (k: string) => string) => t('search.results') + t(\"term.member\");\n";

const roots: string[] = [];

function makeProject(options: { en?: Translations; zh?: Translations; files?: Record<string, string> } = {}): string {
  const root = mkdtempSync(join(tmpdir(), 'check-i18n-'));
  roots.push(root);
  const files: Record<string, string> = {
    'docs/brief/glossary.md': GLOSSARY,
    'src/i18n/en.json': JSON.stringify(options.en ?? EN),
    'src/i18n/zh-Hans.json': JSON.stringify(options.zh ?? ZH),
    'src/ui/client/label.ts': UI_SOURCE,
    ...options.files,
  };
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

function runCheck(root: string): { status: number | null; output: string } {
  const result = spawnSync(process.execPath, [SCRIPT, '--root', root], { encoding: 'utf8' });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

describe('check-i18n', () => {
  it('SC-004 passes when both languages match, placeholders agree, used keys exist and terms match the glossary', () => {
    const { status, output } = runCheck(makeProject());
    expect(output).toMatch(/translations OK/i);
    expect(status).toBe(0);
  });

  it('FR-020 fails when a key exists in one language only', () => {
    const { status, output } = runCheck(makeProject({ en: { ...EN, 'form.title': 'Register' } }));
    expect(status).toBe(1);
    expect(output).toMatch(/form\.title/);
    expect(output).toMatch(/zh-Hans/);
  });

  it('FR-020 fails when a value is empty', () => {
    const { status, output } = runCheck(makeProject({ zh: { ...ZH, 'search.results': '  ' } }));
    expect(status).toBe(1);
    expect(output).toMatch(/empty.*search\.results|search\.results.*empty/i);
  });

  it('FR-020 fails when placeholders differ between languages', () => {
    const { status, output } = runCheck(makeProject({ zh: { ...ZH, 'search.results': '{count} 条结果' } }));
    expect(status).toBe(1);
    expect(output).toMatch(/placeholder.*search\.results|search\.results.*placeholder/i);
  });

  it.each([
    ['src/ui/client/extra.ts'],
    ['src/application/extra.ts'],
    ['src/server/extra.ts'],
    ['src/ui/pages/extra.html'],
  ])('FR-020 fails when a t() key used in %s is missing from the translations', (path) => {
    const root = makeProject({ files: { [path]: "const x = t('member.notTranslated');\n" } });
    const { status, output } = runCheck(root);
    expect(status).toBe(1);
    expect(output).toMatch(/member\.notTranslated/);
    expect(output).toMatch(/extra\.(ts|html)/);
  });

  it('FR-021 fails when an English term differs from the glossary', () => {
    const { status, output } = runCheck(makeProject({ en: { ...EN, 'term.memberNumber': 'Membership ID' } }));
    expect(status).toBe(1);
    expect(output).toMatch(/term\.memberNumber/);
    expect(output).toMatch(/glossary/i);
  });

  it('FR-021 fails when a Chinese term differs from the glossary', () => {
    const { status, output } = runCheck(makeProject({ zh: { ...ZH, 'term.member': '成员' } }));
    expect(status).toBe(1);
    expect(output).toMatch(/term\.member\b/);
    expect(output).toMatch(/glossary/i);
  });

  it('FR-021 fails when a term key has no glossary row', () => {
    const root = makeProject({ en: { ...EN, 'term.fiscalYear': 'Fiscal year' }, zh: { ...ZH, 'term.fiscalYear': '财年' } });
    const { status, output } = runCheck(root);
    expect(status).toBe(1);
    expect(output).toMatch(/term\.fiscalYear/);
  });

  it('FR-021 accepts any one of the glossary alternatives and the term without its parenthetical', () => {
    const root = makeProject({ zh: { ...ZH, 'term.ecMember': '执委', 'term.delete': '删除（会员记录）' } });
    expect(runCheck(root).status).toBe(0);
  });
});
