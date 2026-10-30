// Stub entry point so `npm run build` works from the start (T007).
// T087 replaces it with the real registry, doGet and owner entry points.

export const registry: ReadonlyArray<{ name: string }> = [];

export function dispatch(name: string): unknown {
  void name;
  return { ok: false, error: { code: 'INTERNAL' } };
}

export function doGet(): GoogleAppsScript.HTML.HtmlOutput {
  return HtmlService.createHtmlOutputFromFile('register');
}
