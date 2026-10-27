// @ts-check
import tseslint from 'typescript-eslint';

// Apps Script globals: only src/adapters/gas and src/server may use them (plan.md "Structure Decision").
const APPS_SCRIPT_GLOBALS = [
  'SpreadsheetApp',
  'LockService',
  'CacheService',
  'PropertiesService',
  'UrlFetchApp',
  'HtmlService',
  'Utilities',
  'MailApp',
  'Session',
  'ScriptApp',
  'Logger',
].map((name) => ({
  name,
  message: `Apps Script global '${name}' is allowed only in src/adapters/gas and src/server; use a port.`,
}));

export default tseslint.config(
  {
    ignores: ['node_modules/', 'dist/', 'coverage/', 'test-results/', 'playwright-report/', '.specify/', '.claude/'],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.mjs'],
    rules: {
      // FR-027: no member data in logs; only the logger adapter may write to the console.
      'no-console': 'error',
    },
  },
  {
    files: ['src/adapters/gas/logger.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: [
      'src/domain/**/*.ts',
      'src/application/**/*.ts',
      'src/ports/**/*.ts',
      'src/adapters/memory/**/*.ts',
      'src/ui/**/*.ts',
    ],
    rules: {
      'no-restricted-globals': ['error', ...APPS_SCRIPT_GLOBALS],
    },
  },
  {
    // R1-6: client code builds DOM nodes; never parses HTML strings.
    files: ['src/ui/client/**/*.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        { property: 'innerHTML', message: 'Use textContent / DOM APIs (R1-6).' },
        { property: 'outerHTML', message: 'Use textContent / DOM APIs (R1-6).' },
        { property: 'insertAdjacentHTML', message: 'Use DOM APIs (R1-6).' },
      ],
    },
  },
);
