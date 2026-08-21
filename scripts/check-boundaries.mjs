#!/usr/bin/env node
// scripts/check-boundaries.mjs
//
// Enforces the workspace dependency-boundary rules from ticket T-001 (see
// .harness/reports/T-001/implementation-plan.md §2 and §6):
//   1. packages/astronomy must not depend, directly or transitively within
//      the workspace, on three, react, react-dom or express.
//   2. packages/renderer must not depend, directly or transitively, on
//      react, react-dom or express.
//   3. nothing under packages/ may depend, directly or transitively, on
//      anything under apps/.
//   4. zod may only be a direct dependency of @nova/shared and @nova/api.
//   5. the workspace production-dependency graph must be acyclic.
//
// This module exports a pure `evaluate(manifests)` function so the rules can
// be exercised against synthetic in-memory manifests (see
// tests/boundaries/boundaries.spec.ts) without touching the real workspace,
// plus a CLI entry point that runs it against the real repository and exits
// non-zero on violation.

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));

const FORBIDDEN_EXTERNAL = {
  '@nova/astronomy': ['three', 'react', 'react-dom', 'express'],
  '@nova/renderer': ['react', 'react-dom', 'express'],
};

const ZOD_ALLOWED = new Set(['@nova/shared', '@nova/api']);

/**
 * @param {string} yamlText
 * @returns {string[]} the glob patterns listed under `packages:` in a
 *   pnpm-workspace.yaml file.
 */
export function parseWorkspaceGlobs(yamlText) {
  return yamlText
    .split(/\r?\n/)
    .filter((line) => /^\s*-\s+/.test(line))
    .map((line) => line.replace(/^\s*-\s+/, '').trim())
    .map((entry) => entry.replace(/^["']|["']$/g, ''))
    .filter(Boolean);
}

/**
 * Expands the small subset of glob syntax pnpm-workspace.yaml uses in this
 * repository: an exact directory, or `<dir>/*` for its immediate children.
 * @param {string} pattern
 * @returns {Promise<string[]>} directories relative to the repo root
 */
async function expandGlob(pattern) {
  if (!pattern.endsWith('/*')) {
    return [pattern];
  }
  const parent = pattern.slice(0, -2);
  let entries;
  try {
    entries = await readdir(path.join(REPO_ROOT, parent), { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.posix.join(parent, entry.name));
}

/**
 * @typedef {{ name: string, dir: string, dependencies: Record<string, string>, devDependencies?: Record<string, string>, peerDependencies?: Record<string, string> }} Manifest
 */

/**
 * Reads every workspace package.json into the plain shape `evaluate` needs.
 *
 * `dependencies`, `devDependencies` and `peerDependencies` are kept as
 * separate fields (rather than pre-merged) so rule 4 (zod) can stay scoped to
 * `dependencies` only - a dev-time zod is not a shipped contract - while
 * rules 1-2 (forbidden externals) walk all three, so a forbidden package
 * hidden in devDependencies or peerDependencies still fails the check.
 * @returns {Promise<Manifest[]>}
 */
export async function loadWorkspaceManifests() {
  const workspaceYaml = await readFile(path.join(REPO_ROOT, 'pnpm-workspace.yaml'), 'utf8');
  const globs = parseWorkspaceGlobs(workspaceYaml);
  const dirs = (await Promise.all(globs.map(expandGlob))).flat();

  const manifests = [];
  for (const dir of dirs) {
    let raw;
    try {
      raw = await readFile(path.join(REPO_ROOT, dir, 'package.json'), 'utf8');
    } catch {
      continue;
    }
    const pkg = JSON.parse(raw);
    manifests.push({
      name: pkg.name,
      dir,
      dependencies: pkg.dependencies ?? {},
      devDependencies: pkg.devDependencies ?? {},
      peerDependencies: pkg.peerDependencies ?? {},
    });
  }
  return manifests;
}

/**
 * Pure evaluation of the boundary rules over an in-memory workspace graph.
 * @param {Manifest[]} manifests
 * @returns {{ violations: string[] }}
 */
export function evaluate(manifests) {
  const byName = new Map(manifests.map((m) => [m.name, m]));
  const violations = [];

  /**
   * @param {string} name
   * @param {boolean} includeDevAndPeer when true, walk devDependencies and
   *   peerDependencies as well as dependencies (rules 1-2); when false, walk
   *   production dependencies only (rules 3/5).
   * @returns {{ packages: Set<string>, externals: Set<string> }}
   */
  function closureOf(name, includeDevAndPeer = false) {
    const packages = new Set();
    const externals = new Set();
    const stack = [name];
    while (stack.length > 0) {
      const current = stack.pop();
      if (packages.has(current)) continue;
      packages.add(current);
      const manifest = byName.get(current);
      if (!manifest) continue;
      const deps = includeDevAndPeer
        ? {
            ...manifest.dependencies,
            ...manifest.devDependencies,
            ...manifest.peerDependencies,
          }
        : manifest.dependencies;
      for (const dep of Object.keys(deps)) {
        if (byName.has(dep)) {
          stack.push(dep);
        } else {
          externals.add(dep);
        }
      }
    }
    return { packages, externals };
  }

  // Rules 1 + 2: forbidden external dependencies, direct or transitive,
  // across dependencies + devDependencies + peerDependencies so a forbidden
  // package cannot dodge the check by living in devDependencies.
  for (const [pkgName, forbidden] of Object.entries(FORBIDDEN_EXTERNAL)) {
    if (!byName.has(pkgName)) continue;
    const { externals } = closureOf(pkgName, true);
    for (const bad of forbidden) {
      if (externals.has(bad)) {
        violations.push(`${pkgName} -> (transitive) -> "${bad}": forbidden external dependency`);
      }
    }
  }

  // Rule 3: nothing under packages/ may reach anything under apps/.
  for (const manifest of manifests) {
    if (!manifest.dir.startsWith('packages/')) continue;
    const { packages: reached } = closureOf(manifest.name);
    for (const reachedName of reached) {
      if (reachedName === manifest.name) continue;
      const reachedManifest = byName.get(reachedName);
      if (reachedManifest && reachedManifest.dir.startsWith('apps/')) {
        violations.push(
          `${manifest.name} -> (transitive) -> ${reachedName}: packages/* must not depend on apps/*`,
        );
      }
    }
  }

  // Rule 4: zod is a direct dependency of exactly @nova/shared and @nova/api.
  for (const manifest of manifests) {
    const hasZod = Object.prototype.hasOwnProperty.call(manifest.dependencies, 'zod');
    if (hasZod && !ZOD_ALLOWED.has(manifest.name)) {
      violations.push(
        `${manifest.name} -> "zod": only ${[...ZOD_ALLOWED].join(' and ')} may depend on zod`,
      );
    }
  }

  // Rule 5: the production-dependency graph must be acyclic.
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map(manifests.map((m) => [m.name, WHITE]));
  const path_ = [];
  const visit = (name) => {
    color.set(name, GRAY);
    path_.push(name);
    const manifest = byName.get(name);
    if (manifest) {
      for (const dep of Object.keys(manifest.dependencies)) {
        if (!byName.has(dep)) continue;
        const depColor = color.get(dep);
        if (depColor === GRAY) {
          const cycleStart = path_.indexOf(dep);
          violations.push(
            `cycle in workspace dependency graph: ${[...path_.slice(cycleStart), dep].join(' -> ')}`,
          );
        } else if (depColor === WHITE) {
          visit(dep);
        }
      }
    }
    path_.pop();
    color.set(name, BLACK);
  };
  for (const manifest of manifests) {
    if (color.get(manifest.name) === WHITE) visit(manifest.name);
  }

  return { violations };
}

async function main() {
  const manifests = await loadWorkspaceManifests();
  const { violations } = evaluate(manifests);
  if (violations.length > 0) {
    console.error('Dependency boundary check failed:\n');
    for (const violation of violations) {
      console.error(`  - ${violation}`);
    }
    console.error(
      `\n${violations.length} violation(s). See implementation-plan.md §2/§6 for the rule table.`,
    );
    process.exitCode = 1;
    return;
  }
  console.log(`Dependency boundary check passed for ${manifests.length} workspace package(s).`);
}

const isMain = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isMain) {
  await main();
}
