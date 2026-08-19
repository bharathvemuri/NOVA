import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// Regression coverage for AC 1: "`pnpm install` succeeds on Node 20 LTS from
// a clean checkout with a committed lockfile." This container runs Node
// v22.22.1 (see implementation-plan.md §10 R1), so the Node-20-specific half
// of AC 1 cannot be executed from here — only CI (which pins Node via
// `.nvmrc`) can prove that half. What *is* executable and repeatable from
// any environment is that the pin and the lockfile are actually in place and
// wired into CI, which is what this spec locks down so a future agent cannot
// silently drop them.

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');

interface RootPackageJson {
  engines?: { node?: string };
  packageManager?: string;
}

async function readRootPackageJson(): Promise<RootPackageJson> {
  const raw = await readFile(path.join(repoRoot, 'package.json'), 'utf8');
  return JSON.parse(raw) as RootPackageJson;
}

describe('AC 1 — Node 20 LTS toolchain pin and committed lockfile', () => {
  it('.nvmrc pins Node 20', async () => {
    const nvmrc = (await readFile(path.join(repoRoot, '.nvmrc'), 'utf8')).trim();
    expect(nvmrc).toBe('20');
  });

  it('package.json engines.node requires >=20', async () => {
    const pkg = await readRootPackageJson();
    expect(pkg.engines?.node).toMatch(/^>=20\./);
  });

  it('packageManager is an exact-pinned pnpm version, not a floating range', async () => {
    const pkg = await readRootPackageJson();
    expect(pkg.packageManager).toMatch(/^pnpm@\d+\.\d+\.\d+$/);
  });

  it('control: a floating packageManager range would fail the exact-pin assertion', () => {
    expect('pnpm@^9.15.9').not.toMatch(/^pnpm@\d+\.\d+\.\d+$/);
  });

  it('pnpm-lock.yaml is committed and is a real lockfile, not an empty stub', async () => {
    const lockPath = path.join(repoRoot, 'pnpm-lock.yaml');
    const stats = await stat(lockPath);
    // A real workspace lockfile with 6 packages and third-party deps is
    // multiple KB; an empty/near-empty file would indicate it was never
    // regenerated after a dependency change.
    expect(stats.size).toBeGreaterThan(1000);
    const content = await readFile(lockPath, 'utf8');
    expect(content).toContain('lockfileVersion');
  });

  it('both CI jobs install with --frozen-lockfile, so the committed lockfile is authoritative', async () => {
    const ci = await readFile(path.join(repoRoot, '.github/workflows/ci.yml'), 'utf8');
    const installLines = ci.split('\n').filter((line) => line.includes('pnpm install'));
    // One per job (verify, e2e).
    expect(installLines.length).toBeGreaterThanOrEqual(2);
    for (const line of installLines) {
      expect(line).toContain('--frozen-lockfile');
    }
  });
});
