// Checks the UI test tooling itself (T014 harness, T015 layout helpers) so later 360px tests can rely on it.
import { expect, test } from '@playwright/test';
import { expectNoHorizontalScroll, expectNoOverflow, expectReadableText, expectTapTargets } from './helpers/layout';

const GOOD_PAGE = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{margin:0;font-size:16px} button,input{font-size:16px;min-width:44px;min-height:44px;box-sizing:border-box;max-width:100%}</style>
</head><body><p>Test Person 0001</p><input name="q"><button>OK</button></body></html>`;

type ScriptRun = {
  withSuccessHandler(f: (value: unknown) => void): ScriptRun;
  withFailureHandler(f: (error: Error) => void): ScriptRun;
  whoAmI(sessionToken: string): void;
};

const BAD_PAGE = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{margin:0} .wide{width:600px} small{font-size:10px} input{font-size:12px} button{width:20px;height:20px;padding:0}</style>
</head><body><div class="wide">wide</div><small>tiny</small><input name="q"><button>x</button></body></html>`;

test('harness serves the built pages with a google.script.run stub that reaches /rpc', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const run = (window as unknown as { google: { script: { run: ScriptRun } } }).google.script.run;
        run.withSuccessHandler(resolve).withFailureHandler(reject).whoAmI('token');
      }),
  );
  expect(result).toEqual({ ok: false, error: { code: 'INTERNAL' } });
});

test('layout helpers pass a page that follows the rules', async ({ page }) => {
  await page.setContent(GOOD_PAGE);
  await expectNoHorizontalScroll(page);
  await expectTapTargets(page);
  await expectReadableText(page);
  await expectNoOverflow(page);
});

test('layout helpers catch each kind of violation', async ({ page }) => {
  await page.setContent(BAD_PAGE);
  await expect(expectNoHorizontalScroll(page, 360)).rejects.toThrow(/scrollWidth/);
  await expect(expectTapTargets(page)).rejects.toThrow(/button 20×20/);
  await expect(expectReadableText(page)).rejects.toThrow(/input font 12px[\s\S]*small text font 10px/);
  await expect(expectNoOverflow(page, 360)).rejects.toThrow(/div spans 0…600px/);
});
