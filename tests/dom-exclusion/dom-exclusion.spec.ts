import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Regression coverage for AC 7's DOM-API clause: "packages/astronomy has no
// dependency ... on ... any browser/DOM API". That half of AC 7 is enforced
// purely by packages/astronomy/tsconfig.json ("lib": ["ES2022"], "types":
// []) - scripts/check-boundaries.mjs only walks package-manifest edges, so
// it cannot see a bare `window` reference, and no other gate in this repo
// exercises that tsconfig setting. Without this spec, a future agent could
// add "DOM" back to `lib` (or drop `types: []`) and every existing gate
// (check:boundaries, eslint, the rest of vitest) would stay green.
//
// Fixtures are generated into an OS temp directory at test time (not
// committed under tests/) specifically so the deliberately-invalid probe
// file is never picked up by the workspace's own `tsc -b` build or by
// ESLint's typed-lint project service - it must only ever be compiled by
// the isolated `tsc -p <tmpdir>` invocations below, which extend the real
// packages/astronomy/tsconfig.json by absolute path.

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const tsc = path.join(repoRoot, 'node_modules/.bin/tsc');
const astronomyTsconfig = path.join(repoRoot, 'packages/astronomy/tsconfig.json');

let workDir: string;

beforeAll(async () => {
  workDir = await mkdtemp(path.join(tmpdir(), 'nova-dom-exclusion-'));

  // Mark the temp dir as an ESM package so `verbatimModuleSyntax` (inherited
  // from tsconfig.base.json) doesn't reject the top-level `export` as a
  // CommonJS-context error before the DOM-lib check is ever reached.
  await writeFile(path.join(workDir, 'package.json'), JSON.stringify({ type: 'module' }));

  await writeFile(
    path.join(workDir, 'window-usage.ts'),
    "export const hasWindow = typeof window !== 'undefined';\n",
  );
  await writeFile(
    path.join(workDir, 'es2022-only.ts'),
    'export const frozen: readonly number[] = Object.freeze([1, 2, 3]);\n',
  );

  const probeCompilerOptions = {
    composite: false,
    noEmit: true,
    // Override the inherited packages/astronomy rootDir/outDir (resolved
    // against packages/astronomy itself via `extends`), which would
    // otherwise reject every file in this temp directory with TS6059
    // before the DOM-lib check is ever reached.
    rootDir: workDir,
    outDir: path.join(workDir, 'out'),
  };

  await writeFile(
    path.join(workDir, 'tsconfig.fail-probe.json'),
    JSON.stringify(
      {
        extends: astronomyTsconfig,
        compilerOptions: probeCompilerOptions,
        include: ['window-usage.ts'],
      },
      null,
      2,
    ),
  );
  await writeFile(
    path.join(workDir, 'tsconfig.pass-probe.json'),
    JSON.stringify(
      {
        extends: astronomyTsconfig,
        compilerOptions: probeCompilerOptions,
        include: ['es2022-only.ts'],
      },
      null,
      2,
    ),
  );
});

afterAll(async () => {
  await rm(workDir, { recursive: true, force: true });
});

function runTsc(configName: string) {
  return spawnSync(tsc, ['--noEmit', '-p', path.join(workDir, configName)], {
    cwd: workDir,
    encoding: 'utf8',
  });
}

describe('packages/astronomy DOM-API exclusion (AC 7)', () => {
  it('rejects a browser/DOM global under the real astronomy tsconfig', () => {
    const result = runTsc('tsconfig.fail-probe.json');

    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain("Cannot find name 'window'");
  });

  it('control: DOM-free ES2022 code compiles clean under the same tsconfig', () => {
    const result = runTsc('tsconfig.pass-probe.json');

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe('');
  });
});

// --- Transitive reference-closure coverage (T-001 cycle 3, A-001) --------
//
// The two tests above prove astronomy's *own* tsconfig excludes DOM. They
// say nothing about what astronomy pulls in via TypeScript project
// references: tsconfig.base.json sets "skipLibCheck": true, so a DOM type
// reaching astronomy through packages/shared's emitted .d.ts is invisible to
// `tsc -b` and to every other existing gate. Putting "DOM" back into
// packages/shared/tsconfig.json's `lib` today would not fail `pnpm
// typecheck`, `pnpm lint`, `pnpm check:boundaries`, or the two tests above -
// this block closes that gap by asserting the structural invariant directly
// on the tsconfig *inputs*, over the whole transitive reference closure
// rather than astronomy alone.

interface TsconfigJson {
  extends?: string;
  compilerOptions?: Record<string, unknown>;
  references?: Array<{ path: string }>;
}

function readTsconfigJson(configPath: string): TsconfigJson {
  return JSON.parse(readFileSync(configPath, 'utf8')) as TsconfigJson;
}

// Merges a tsconfig's `compilerOptions` with those inherited via `extends`,
// matching tsc's own precedence (the extending file wins). Recurses so a
// multi-level `extends` chain resolves correctly, though this repo only has
// one level today.
function resolveEffectiveCompilerOptions(configPath: string): Record<string, unknown> {
  const config = readTsconfigJson(configPath);
  const base = config.extends
    ? resolveEffectiveCompilerOptions(path.resolve(path.dirname(configPath), config.extends))
    : {};
  return { ...base, ...(config.compilerOptions ?? {}) };
}

// Walks `references[].path` transitively from `startConfigPath`, returning
// the absolute path of every tsconfig.json reached, including the start
// file itself. General on purpose: today astronomy references only
// packages/shared, but this must keep working unchanged if astronomy gains
// further references later.
function collectReferenceClosure(startConfigPath: string): string[] {
  const seen = new Set<string>();
  const stack = [startConfigPath];
  while (stack.length > 0) {
    const configPath = stack.pop() as string;
    if (seen.has(configPath)) continue;
    seen.add(configPath);
    const config = readTsconfigJson(configPath);
    for (const ref of config.references ?? []) {
      const refTarget = path.resolve(path.dirname(configPath), ref.path);
      stack.push(refTarget.endsWith('.json') ? refTarget : path.join(refTarget, 'tsconfig.json'));
    }
  }
  return [...seen];
}

const astronomyReferenceClosure = collectReferenceClosure(astronomyTsconfig);
const astronomyReferenceClosureLabels = astronomyReferenceClosure.map((configPath) =>
  path.relative(repoRoot, configPath),
);

describe("packages/astronomy's transitive tsconfig reference closure excludes DOM (AC 7)", () => {
  it('the closure is non-empty and actually reaches packages/shared (a walk over nothing cannot fail)', () => {
    expect(astronomyReferenceClosureLabels.length).toBeGreaterThanOrEqual(2);
    expect(astronomyReferenceClosureLabels).toContain(
      path.join('packages', 'astronomy', 'tsconfig.json'),
    );
    expect(astronomyReferenceClosureLabels).toContain(
      path.join('packages', 'shared', 'tsconfig.json'),
    );
  });

  it.each(astronomyReferenceClosureLabels)(
    '%s has no DOM/webworker lib entry and an empty "types" array',
    (label) => {
      const configPath = path.join(repoRoot, label);
      const options = resolveEffectiveCompilerOptions(configPath);
      const lib = (options.lib as string[] | undefined) ?? [];
      const domLike = lib.filter((entry) => /^dom/i.test(entry) || /^webworker/i.test(entry));

      expect(domLike, `${label} lib=${JSON.stringify(lib)}`).toEqual([]);
      expect(options.types, `${label} types=${JSON.stringify(options.types)}`).toEqual([]);
    },
  );
});
