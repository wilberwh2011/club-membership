// Synthetic-fixture scan (scripts/check-fixtures.mjs): constitution Principle I.
// Each test builds a small project in a temp folder and runs the CLI against it.
// Non-synthetic values are assembled at runtime so this file itself passes the real scan.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { generateSyntheticMembers } from '../fixtures/synthetic';

const SCRIPT = resolve(__dirname, '../../scripts/check-fixtures.mjs');

const NAME_EN = ['name', 'En'].join('');
const NAME_ZH = ['name', 'zh'].join('_');
const DISPLAY_NAME = ['display', 'Name'].join('');
const NON_SYNTHETIC_EMAIL = ['someone', 'mail.test'].join('@');
const WRONG_LINE_PHONE = ['902', '555', '0200'].join('-');
const WRONG_EXCHANGE_PHONE = ['902', '999', '0123'].join('-');

const roots: string[] = [];

function makeProject(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'check-fixtures-'));
  roots.push(root);
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

function runScan(root: string): { status: number | null; output: string } {
  const result = spawnSync(process.execPath, [SCRIPT, '--root', root], { encoding: 'utf8' });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

describe('check-fixtures', () => {
  it('Principle I passes for the output of tests/fixtures/synthetic.ts and other synthetic values', () => {
    const root = makeProject({
      'tests/fixtures/members.json': JSON.stringify(generateSyntheticMembers({ n: 300 }), null, 2),
      'tests/unit/sample.test.ts': [
        `const a = { email: 'test0001@example.com', phone: '+1 604-555-0123' };`,
        `const b = { ${DISPLAY_NAME}: 'Test Admin', ${NAME_ZH}: '测试会员', ${NAME_EN}: '' };`,
        '',
      ].join('\n'),
      'src/server/setup.ts': `const admin = 'admin@example.org';\n`,
    });
    const { status, output } = runScan(root);
    expect(output).toMatch(/fixtures OK/i);
    expect(status).toBe(0);
  });

  it('Principle I fails for an email outside example.org / example.com', () => {
    const root = makeProject({ 'tests/fixtures/bad.json': JSON.stringify({ email: NON_SYNTHETIC_EMAIL }) });
    const { status, output } = runScan(root);
    expect(status).toBe(1);
    expect(output).toMatch(/tests\/fixtures\/bad\.json:\d+.*email/i);
  });

  it.each([
    ['line number not 01xx', WRONG_LINE_PHONE],
    ['exchange not 555', WRONG_EXCHANGE_PHONE],
    ['+1 and ten digits', `+1${WRONG_LINE_PHONE.replace(/-/g, '')}`],
  ])('Principle I fails for a phone with %s', (_label, phone) => {
    const root = makeProject({ 'tests/application/bad.test.ts': `const phone = '${phone}';\n` });
    const { status, output } = runScan(root);
    expect(status).toBe(1);
    expect(output).toMatch(/tests\/application\/bad\.test\.ts:\d+.*phone/i);
  });

  it.each([
    [NAME_EN, 'Alex Sample'],
    [NAME_ZH, '张三'],
    [DISPLAY_NAME, 'Sam Example'],
  ])('Principle I fails for a non-test name in %s under scripts/', (key, value) => {
    const root = makeProject({ 'scripts/seed.mjs': `export const member = { ${key}: '${value}' };\n` });
    const { status, output } = runScan(root);
    expect(status).toBe(1);
    expect(output).toMatch(/scripts\/seed\.mjs:\d+.*name/i);
  });

  it('Principle I scans src/server/setup.ts', () => {
    const root = makeProject({ 'src/server/setup.ts': `const admin = '${NON_SYNTHETIC_EMAIL}';\n` });
    const { status, output } = runScan(root);
    expect(status).toBe(1);
    expect(output).toMatch(/src\/server\/setup\.ts:\d+.*email/i);
  });

  it('Principle I does not print the offending value', () => {
    const root = makeProject({ 'tests/fixtures/bad.json': JSON.stringify({ email: NON_SYNTHETIC_EMAIL }) });
    expect(runScan(root).output).not.toContain(NON_SYNTHETIC_EMAIL);
  });
});
