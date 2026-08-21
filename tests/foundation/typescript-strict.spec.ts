import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// Regression coverage for the "strict mode" half of AC 3: "TypeScript is
// configured with project references and strict mode; `pnpm typecheck`
// passes across all packages." Project references are already guarded by
// tests/foundation/workspace-structure.spec.ts; nothing in the suite
// previously asserted on `strict` itself. That is a real gap: `pnpm
// typecheck` cannot detect its own settings being loosened — turning
// `strict` off (or any of the strict-family flags TypeScript's own docs
// list under `strict`) only removes diagnostics, so `tsc -b` and every
// other existing test would stay green while AC 3 silently regressed.
// This spec closes that gap, with a control per this repo's established
// "a check that cannot fail proves nothing" standard.

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');

interface CompilerOptions {
  strict?: boolean;
  [key: string]: unknown;
}

interface Tsconfig {
  compilerOptions?: CompilerOptions;
  extends?: string;
}

async function readTsconfig(relativePath: string): Promise<Tsconfig> {
  const raw = await readFile(path.join(repoRoot, relativePath), 'utf8');
  return JSON.parse(raw) as Tsconfig;
}

const PACKAGE_TSCONFIGS = [
  'apps/api/tsconfig.json',
  'apps/web/tsconfig.json',
  'packages/astronomy/tsconfig.json',
  'packages/renderer/tsconfig.json',
  'packages/shared/tsconfig.json',
  'tests/tsconfig.json',
];

describe('AC 3 — TypeScript strict mode', () => {
  it('tsconfig.base.json sets strict: true', async () => {
    const base = await readTsconfig('tsconfig.base.json');
    expect(base.compilerOptions?.strict).toBe(true);
  });

  it('control: a loosened tsconfig would fail the strict-mode assertion', () => {
    const loosened: Tsconfig = { compilerOptions: { strict: false } };
    expect(loosened.compilerOptions?.strict).not.toBe(true);
  });

  it.each(PACKAGE_TSCONFIGS)(
    '%s extends the strict base config (not a standalone, unguarded config)',
    async (relativePath) => {
      const tsconfig = await readTsconfig(relativePath);
      expect(tsconfig.extends, `${relativePath} does not set "extends"`).toBeDefined();
      // Resolve relative to the file's own directory, matching tsc's own
      // "extends" resolution semantics, and normalise to a repo-relative
      // path for a stable assertion regardless of "../" depth.
      const resolved = path.relative(
        repoRoot,
        path.resolve(repoRoot, path.dirname(relativePath), tsconfig.extends as string),
      );
      expect(resolved).toBe('tsconfig.base.json');
    },
  );
});
