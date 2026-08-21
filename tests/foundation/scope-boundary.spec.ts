import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

// Regression coverage for AC 12: "No astronomical calculation, HTTP route, or
// Three.js scene code is added by this task." Nothing else in the suite
// checks this — the toolchain/lint/typecheck gates happily accept a real
// Express route, orbital-mechanics function or THREE.Scene, since none of
// that is forbidden by the package-boundary rules (an HTTP route inside
// apps/api, for instance, imports nothing new). Per the QA standard, a
// criterion with no executed test is not done, so this walks the actual
// product-surface source directories for tokens that would mean scope crept
// past the placeholder, plus a control proving the same scan fires on code
// that must be flagged.

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');

interface ScanTarget {
  dir: string;
  tokens: string[];
}

async function walkSourceFiles(dir: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      files.push(...(await walkSourceFiles(full)));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

async function scan(targets: ScanTarget[]): Promise<Array<{ file: string; token: string }>> {
  const matches: Array<{ file: string; token: string }> = [];
  for (const { dir, tokens } of targets) {
    for (const file of await walkSourceFiles(dir)) {
      const src = await readFile(file, 'utf8');
      for (const token of tokens) {
        if (src.includes(token)) {
          matches.push({ file: path.relative(repoRoot, file), token });
        }
      }
    }
  }
  return matches;
}

// Real product-surface directories, grouped by the feature class AC 12
// forbids in each.
const HTTP_ROUTE_TOKENS = [
  'express(',
  'app.get(',
  'app.post(',
  'app.put(',
  'app.delete(',
  'app.patch(',
  'Router()',
];
const THREEJS_SCENE_TOKENS = [
  'THREE.',
  "from 'three'",
  'PerspectiveCamera',
  'WebGLRenderer',
  'OrbitControls',
];
const ASTRONOMY_CALC_TOKENS = [
  'Kepler',
  'meanAnomaly',
  'trueAnomaly',
  'eccentricAnomaly',
  'orbitalPeriod',
  'computeEphemeris',
  'Math.sin',
  'Math.cos',
];

const API_TARGET: ScanTarget = {
  dir: path.join(repoRoot, 'apps/api/src'),
  tokens: HTTP_ROUTE_TOKENS,
};
const WEB_TARGET: ScanTarget = {
  dir: path.join(repoRoot, 'apps/web/src'),
  tokens: THREEJS_SCENE_TOKENS,
};
const RENDERER_TARGET: ScanTarget = {
  dir: path.join(repoRoot, 'packages/renderer/src'),
  tokens: THREEJS_SCENE_TOKENS,
};
const ASTRONOMY_TARGET: ScanTarget = {
  dir: path.join(repoRoot, 'packages/astronomy/src'),
  tokens: ASTRONOMY_CALC_TOKENS,
};

describe('AC 12 — no astronomical calculation, HTTP route, or Three.js scene code was added', () => {
  it('apps/api/src contains no Express route/app construction', async () => {
    const matches = await scan([API_TARGET]);
    expect(matches).toEqual([]);
  });

  it('apps/web/src and packages/renderer/src contain no Three.js scene construction', async () => {
    const matches = await scan([WEB_TARGET, RENDERER_TARGET]);
    expect(matches).toEqual([]);
  });

  it('packages/astronomy/src contains no orbital-mechanics calculation', async () => {
    const matches = await scan([ASTRONOMY_TARGET]);
    expect(matches).toEqual([]);
  });

  describe('control: the same scan is proven to fire on code that must be flagged', () => {
    let fixtureDir: string | undefined;

    afterEach(async () => {
      if (fixtureDir) {
        await rm(fixtureDir, { recursive: true, force: true });
        fixtureDir = undefined;
      }
    });

    it('flags a synthetic Express route placed in a scratch directory', async () => {
      fixtureDir = await mkdtemp(path.join(tmpdir(), 'nova-ac12-fixture-'));
      await writeFile(
        path.join(fixtureDir, 'route.ts'),
        "import express from 'express';\nconst app = express();\napp.get('/health', (_req, res) => res.send('ok'));\n",
      );
      const matches = await scan([{ dir: fixtureDir, tokens: HTTP_ROUTE_TOKENS }]);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some((m) => m.token === 'express(')).toBe(true);
      expect(matches.some((m) => m.token === 'app.get(')).toBe(true);
    });

    it('flags a synthetic Three.js scene placed in a scratch directory', async () => {
      fixtureDir = await mkdtemp(path.join(tmpdir(), 'nova-ac12-fixture-'));
      await writeFile(
        path.join(fixtureDir, 'scene.ts'),
        "import * as THREE from 'three';\nconst scene = new THREE.Scene();\nconst camera = new THREE.PerspectiveCamera();\n",
      );
      const matches = await scan([{ dir: fixtureDir, tokens: THREEJS_SCENE_TOKENS }]);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some((m) => m.token === 'PerspectiveCamera')).toBe(true);
    });

    it('flags synthetic orbital-mechanics calculation placed in a scratch directory', async () => {
      fixtureDir = await mkdtemp(path.join(tmpdir(), 'nova-ac12-fixture-'));
      await writeFile(
        path.join(fixtureDir, 'ephemeris.ts'),
        'export function computeEphemeris(meanAnomaly: number): number {\n  return Math.sin(meanAnomaly) + Math.cos(meanAnomaly);\n}\n',
      );
      const matches = await scan([{ dir: fixtureDir, tokens: ASTRONOMY_CALC_TOKENS }]);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some((m) => m.token === 'computeEphemeris')).toBe(true);
    });
  });
});
