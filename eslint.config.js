// @ts-check
import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const TS_FILES = ['**/*.ts', '**/*.tsx'];
const UNCHECKED_CONFIG_FILES = [
  '**/*.config.ts',
  '**/*.config.mts',
  '**/*.config.js',
  '**/*.config.mjs',
  'scripts/**/*.mjs',
];

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/dist-types/**',
      '**/node_modules/**',
      '.pnpm-store/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/.vite/**',
      '**/*.tsbuildinfo',
      'pnpm-lock.yaml',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: TS_FILES,
  })),
  {
    files: TS_FILES,
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // TypeScript's compiler already reports undefined references with full
      // type information; the core rule produces false positives on types.
      'no-undef': 'off',
    },
  },
  {
    // Root/package-level tool configs are not part of any package's
    // `tsconfig.json` `include`, so they cannot be type-checked without a
    // dedicated project. Lint them syntactically only.
    files: UNCHECKED_CONFIG_FILES,
    ...tseslint.configs.disableTypeChecked,
  },
  {
    // Plain Node ESM tooling (scripts/, this file, root *.config.* files):
    // give it Node's runtime globals so `no-undef` does not flag `process`,
    // `console`, etc.
    files: ['scripts/**/*.mjs', '*.config.js', '*.config.mjs'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    // AC 8, generalised: no package under packages/ may depend on an app.
    //
    // This block is declared FIRST and the more specific astronomy/renderer
    // blocks below are declared LAST, because ESLint flat config *replaces*
    // a rule's options when multiple config objects match the same file - it
    // does not merge them. Whichever object matching a given file appears
    // last in this array wins entirely. Astronomy's and renderer's groups
    // are both supersets of this generic one (they include `@nova/web`/
    // `@nova/api` plus their own package-specific restrictions), so ordering
    // them after this block preserves the generic restriction rather than
    // silently discarding it. Do not reorder without re-verifying that
    // invariant - see tests/boundaries/lint-boundaries.spec.ts, which fails
    // loudly if it is ever violated again.
    files: ['packages/**/*.ts', 'packages/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@nova/web', '@nova/web/*', '@nova/api', '@nova/api/*'],
              message: 'AC 8: packages/* must not depend on apps/*.',
            },
          ],
        },
      ],
    },
  },
  {
    // ADR-001 / 001 §7.1: astronomy must stay free of rendering, UI, HTTP
    // and workspace edges into anything that carries those dependencies.
    // Superset of the generic packages/** block above (also blocks
    // @nova/web / @nova/api), so it is safe for this to win on override.
    files: ['packages/astronomy/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'three',
                'three/*',
                'react',
                'react-dom',
                'react/*',
                'express',
                '@nova/renderer',
                '@nova/renderer/*',
                '@nova/web',
                '@nova/web/*',
                '@nova/api',
                '@nova/api/*',
              ],
              message:
                '001 §7.1 / ADR-001: packages/astronomy must not import rendering, UI or HTTP code.',
            },
          ],
        },
      ],
    },
  },
  {
    // AC 8: renderer must not depend on React or Express. Also carries the
    // generic packages/**  restriction (@nova/web / @nova/api) forward
    // explicitly, since this block overrides - rather than merges with -
    // the generic block above for every file it matches.
    files: ['packages/renderer/**/*.ts', 'packages/renderer/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react-dom',
                'react/*',
                'express',
                '@nova/api',
                '@nova/api/*',
                '@nova/web',
                '@nova/web/*',
              ],
              message: 'AC 8: packages/renderer must not depend on React, Express, or any app.',
            },
          ],
        },
      ],
    },
  },
  eslintConfigPrettier,
);
