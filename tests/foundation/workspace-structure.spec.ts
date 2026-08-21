import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// Regression coverage for AC 2: "Workspace packages exist and resolve from
// each other: apps/web, apps/api, packages/astronomy, packages/renderer,
// packages/shared, plus scripts/ and tests/ directories." `pnpm build` and
// `pnpm typecheck` already *prove* resolution today (a broken import fails
// tsc), but neither leaves behind a repeatable assertion that a future
// agent's refactor is checked against — this spec is that assertion, mirrors
// tests/boundaries/boundaries.spec.ts's approach of asserting on real,
// in-tree structure rather than only on build exit codes.

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');

const REQUIRED_DIRS = [
  'apps/web',
  'apps/api',
  'packages/astronomy',
  'packages/renderer',
  'packages/shared',
  'scripts',
  'tests',
];

describe('AC 2 — required workspace directories exist', () => {
  it.each(REQUIRED_DIRS)('%s exists as a directory', async (dir) => {
    const stats = await stat(path.join(repoRoot, dir));
    expect(stats.isDirectory()).toBe(true);
  });
});

interface RootTsconfig {
  references: Array<{ path: string }>;
}

describe('AC 2 / AC 3 — packages resolve from each other via TypeScript project references', () => {
  it('root tsconfig.json references every workspace package plus tests', async () => {
    const raw = await readFile(path.join(repoRoot, 'tsconfig.json'), 'utf8');
    const tsconfig = JSON.parse(raw) as RootTsconfig;
    const referenced = tsconfig.references.map((r) => r.path);
    expect(referenced).toEqual(
      expect.arrayContaining([
        'packages/shared',
        'packages/astronomy',
        'packages/renderer',
        'apps/api',
        'apps/web',
        'tests',
      ]),
    );
  });

  it('apps/api actually imports @nova/astronomy and @nova/shared (real cross-package edge)', async () => {
    const src = await readFile(path.join(repoRoot, 'apps/api/src/index.ts'), 'utf8');
    expect(src).toContain("from '@nova/astronomy'");
    expect(src).toContain("from '@nova/shared'");
  });

  it('apps/web actually imports @nova/renderer and @nova/shared (real cross-package edge)', async () => {
    const src = await readFile(path.join(repoRoot, 'apps/web/src/app/App.tsx'), 'utf8');
    expect(src).toContain("from '@nova/renderer'");
    expect(src).toContain("from '@nova/shared'");
  });

  it('packages/astronomy and packages/renderer each import @nova/shared', async () => {
    const astronomySrc = await readFile(
      path.join(repoRoot, 'packages/astronomy/src/index.ts'),
      'utf8',
    );
    const rendererSrc = await readFile(
      path.join(repoRoot, 'packages/renderer/src/index.ts'),
      'utf8',
    );
    expect(astronomySrc).toContain("from '@nova/shared'");
    expect(rendererSrc).toContain("from '@nova/shared'");
  });
});
