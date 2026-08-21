import { rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ESLint } from 'eslint';
import { afterEach, describe, expect, it } from 'vitest';

// Regression coverage for review finding R-001 (T-001, first review cycle):
// ESLint flat config *replaces* — never merges — a rule's options when
// several config objects in eslint.config.js match the same file, so a
// later, narrower `no-restricted-imports` block silently discarded the
// astronomy/renderer-specific restrictions declared earlier in the file.
// `pnpm lint` stayed green throughout because a rule that matches nothing
// cannot fail — the only way to catch that is to execute the rule against
// code that must be flagged, exactly as boundaries.spec.ts already does for
// scripts/check-boundaries.mjs (plan §6 layer 1). This file holds layer 2
// (the ESLint import-level check) to that same standard.
//
// Fixtures are written into the real packages/astronomy/src and
// packages/renderer/src directories, not an OS temp directory: ESLint's
// flat-config `files` glob patterns (e.g. `packages/astronomy/**/*.ts`) are
// matched against the path relative to the repo root, and
// typescript-eslint's `projectService` only resolves a file that a real
// tsconfig's `include` glob covers (`packages/astronomy/tsconfig.json`
// includes `"src"`). Each fixture is removed in `afterEach`, including on
// assertion failure, so no stray file survives a failed run.

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');

const ASTRONOMY_FIXTURE = path.join(
  repoRoot,
  'packages/astronomy/src/__eslint_boundary_fixture__.ts',
);
const ASTRONOMY_TSX_FIXTURE = path.join(
  repoRoot,
  'packages/astronomy/src/__eslint_boundary_fixture__.tsx',
);
const RENDERER_FIXTURE = path.join(
  repoRoot,
  'packages/renderer/src/__eslint_boundary_fixture__.ts',
);

// typescript-eslint's projectService cold-starts a full TypeScript program
// for a package the first time this suite lints a file in it (~30s observed
// for packages/astronomy); the default 5s Vitest test timeout is tuned for
// pure-logic tests like boundaries.spec.ts, not a real typed-lint
// invocation, so these tests get an explicit, generous timeout.
const ESLINT_TEST_TIMEOUT = 60_000;

const written = new Set<string>();

afterEach(async () => {
  await Promise.all([...written].map((file) => rm(file, { force: true })));
  written.clear();
});

async function lintFixture(filePath: string, code: string) {
  await writeFile(filePath, code, 'utf8');
  written.add(filePath);
  const eslint = new ESLint({ cwd: repoRoot });
  const results = await eslint.lintFiles([filePath]);
  return results[0]?.messages ?? [];
}

function restrictedImportLines(messages: Awaited<ReturnType<typeof lintFixture>>) {
  return messages
    .filter((message) => message.ruleId === 'no-restricted-imports')
    .map((message) => message.line)
    .sort((a, b) => (a ?? 0) - (b ?? 0));
}

describe('ESLint import-level boundary enforcement (AC 7 / AC 8 — plan §6 layer 2)', () => {
  it(
    'flags every forbidden import inside packages/astronomy, one per line',
    async () => {
      const forbidden = [
        'three',
        'react',
        'react-dom',
        'express',
        '@nova/renderer',
        '@nova/web',
        '@nova/api',
      ];
      const code =
        forbidden.map((spec, i) => `import * as m${i} from '${spec}';`).join('\n') +
        '\n\n' +
        `export const touched = [${forbidden.map((_, i) => `m${i}`).join(', ')}];\n`;

      const messages = await lintFixture(ASTRONOMY_FIXTURE, code);
      const lines = restrictedImportLines(messages);

      // One no-restricted-imports error per forbidden import statement, on
      // its own line — proves each import was individually caught, not
      // just that *some* violation fired.
      expect(lines).toEqual(forbidden.map((_, i) => i + 1));
      expect(messages.filter((m) => m.ruleId === 'no-restricted-imports')).toHaveLength(
        forbidden.length,
      );
    },
    ESLINT_TEST_TIMEOUT,
  );

  it(
    // The astronomy block above originally matched only `**/*.ts`, so a
    // `.tsx` file fell through to the generic packages/** block (line ~80)
    // and was restricted from @nova/web/@nova/api only — not from three,
    // react, react-dom or express. packages/astronomy/tsconfig.json's
    // `include: ["src"]` picks up `.tsx` alongside `.ts`, so such a file is
    // a real, compilable location, not a hypothetical one. Plan §9 S1.
    'flags every forbidden import inside a packages/astronomy .tsx file, same as .ts',
    async () => {
      const forbidden = [
        'three',
        'react',
        'react-dom',
        'express',
        '@nova/renderer',
        '@nova/web',
        '@nova/api',
      ];
      const code =
        forbidden.map((spec, i) => `import * as m${i} from '${spec}';`).join('\n') +
        '\n\n' +
        `export const touched = [${forbidden.map((_, i) => `m${i}`).join(', ')}];\n`;

      const messages = await lintFixture(ASTRONOMY_TSX_FIXTURE, code);
      const lines = restrictedImportLines(messages);

      expect(lines).toEqual(forbidden.map((_, i) => i + 1));
      expect(messages.filter((m) => m.ruleId === 'no-restricted-imports')).toHaveLength(
        forbidden.length,
      );
    },
    ESLINT_TEST_TIMEOUT,
  );

  it(
    'flags every forbidden import inside packages/renderer, including @nova/web (the omission this review caught)',
    async () => {
      const forbidden = ['react', 'react-dom', 'express', '@nova/api', '@nova/web'];
      const code =
        forbidden.map((spec, i) => `import * as m${i} from '${spec}';`).join('\n') +
        '\n\n' +
        `export const touched = [${forbidden.map((_, i) => `m${i}`).join(', ')}];\n`;

      const messages = await lintFixture(RENDERER_FIXTURE, code);
      const lines = restrictedImportLines(messages);

      expect(lines).toEqual(forbidden.map((_, i) => i + 1));
      expect(messages.filter((m) => m.ruleId === 'no-restricted-imports')).toHaveLength(
        forbidden.length,
      );
    },
    ESLINT_TEST_TIMEOUT,
  );

  it(
    'control: the real, in-tree entry points are clean',
    async () => {
      const eslint = new ESLint({ cwd: repoRoot });
      const results = await eslint.lintFiles([
        'packages/astronomy/src/index.ts',
        'packages/renderer/src/index.ts',
      ]);

      expect(results).toHaveLength(2);
      for (const result of results) {
        expect(result.messages.filter((m) => m.ruleId === 'no-restricted-imports')).toEqual([]);
      }
    },
    ESLINT_TEST_TIMEOUT,
  );
});
