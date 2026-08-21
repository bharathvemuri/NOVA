import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// Regression coverage for AC 9 ("GitHub Actions workflow runs install,
// typecheck, lint, unit tests and build on push and pull request") and for
// SEC-001 (security-report.md), the mutable-Actions-tag finding that was
// fixed this cycle. Nothing else in the suite parses ci.yml, so a future
// agent could drop a gate, reorder it after `build`, or revert the SHA pins
// back to floating tags with every other gate staying green.

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');

async function readCi() {
  return readFile(path.join(repoRoot, '.github/workflows/ci.yml'), 'utf8');
}

describe('AC 9 — CI workflow triggers and gate ordering', () => {
  it('triggers on both push and pull_request', async () => {
    const ci = await readCi();
    const onBlock = ci.slice(ci.indexOf('\non:'), ci.indexOf('\njobs:'));
    expect(onBlock).toMatch(/push:/);
    expect(onBlock).toMatch(/pull_request:/);
  });

  it('the verify job runs boundaries, typecheck, lint, unit tests and build, in that order', async () => {
    const ci = await readCi();
    const requiredSteps = [
      'run: pnpm install --frozen-lockfile',
      'run: pnpm check:boundaries',
      'run: pnpm typecheck',
      'run: pnpm lint',
      'run: pnpm test',
      'run: pnpm build',
    ];
    const positions = requiredSteps.map((step) => {
      const idx = ci.indexOf(step);
      expect(idx, `missing CI step "${step}"`).toBeGreaterThan(-1);
      return idx;
    });
    for (let i = 1; i < positions.length; i++) {
      expect(
        positions[i],
        `"${requiredSteps[i]}" must run after "${requiredSteps[i - 1]}"`,
      ).toBeGreaterThan(positions[i - 1]!);
    }
  });

  it('control: a missing step would fail the presence assertion', async () => {
    const ci = await readCi();
    expect(ci.indexOf('run: pnpm this-script-does-not-exist')).toBe(-1);
  });
});

describe('SEC-001 regression guard — third-party Actions pinned to full commit SHAs', () => {
  it('every `uses:` reference is pinned to a 40-character commit SHA, not a mutable tag', async () => {
    const ci = await readCi();
    const usesRefs = [...ci.matchAll(/uses:\s*(\S+)/g)].map((m) => m[1]!);
    // 3 third-party actions x 2 jobs (verify, e2e).
    expect(usesRefs.length).toBeGreaterThanOrEqual(6);
    for (const ref of usesRefs) {
      expect(ref, `${ref} is not pinned to a 40-character commit SHA`).toMatch(/@[0-9a-f]{40}$/);
    }
  });

  it('control: a bare version tag is rejected by the SHA-pin pattern', () => {
    expect('actions/checkout@v4').not.toMatch(/@[0-9a-f]{40}$/);
  });

  it('workflow keeps least-privilege permissions and uses pull_request, not pull_request_target', async () => {
    const ci = await readCi();
    expect(ci).toMatch(/permissions:\s*\n\s*contents:\s*read/);
    expect(ci).not.toContain('pull_request_target');
  });
});
