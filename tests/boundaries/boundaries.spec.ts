import { describe, expect, it } from 'vitest';

import { evaluate, loadWorkspaceManifests } from '../../scripts/check-boundaries.mjs';

describe('workspace dependency boundaries', () => {
  it('reports zero violations for the real workspace', async () => {
    const manifests = await loadWorkspaceManifests();
    expect(manifests.length).toBeGreaterThanOrEqual(5);

    const { violations } = evaluate(manifests);

    expect(violations).toEqual([]);
  });

  it('detects a transitive violation: astronomy -> renderer -> react (AC 7)', () => {
    const syntheticManifests = [
      { name: '@nova/shared', dir: 'packages/shared', dependencies: {} },
      {
        name: '@nova/astronomy',
        dir: 'packages/astronomy',
        dependencies: { '@nova/renderer': 'workspace:*' },
      },
      {
        name: '@nova/renderer',
        dir: 'packages/renderer',
        dependencies: { react: '19.2.8' },
      },
    ];

    const { violations } = evaluate(syntheticManifests);

    expect(violations).toContainEqual(
      expect.stringContaining('@nova/astronomy -> (transitive) -> "react"'),
    );
  });

  it('detects a forbidden external hidden in devDependencies (AC 7)', () => {
    const syntheticManifests = [
      {
        name: '@nova/astronomy',
        dir: 'packages/astronomy',
        dependencies: {},
        devDependencies: { three: '*' },
      },
    ];

    const { violations } = evaluate(syntheticManifests);

    expect(violations).toContainEqual(
      expect.stringContaining('@nova/astronomy -> (transitive) -> "three"'),
    );
  });

  it('detects packages/* transitively depending on apps/* (AC 8)', () => {
    const syntheticManifests = [
      {
        name: '@nova/astronomy',
        dir: 'packages/astronomy',
        dependencies: { '@nova/api': 'workspace:*' },
      },
      { name: '@nova/api', dir: 'apps/api', dependencies: {} },
    ];

    const { violations } = evaluate(syntheticManifests);

    expect(violations).toContainEqual(
      expect.stringContaining('@nova/astronomy -> (transitive) -> @nova/api'),
    );
  });

  it('detects zod outside packages/shared and apps/api (AC 6)', () => {
    const syntheticManifests = [
      { name: '@nova/renderer', dir: 'packages/renderer', dependencies: { zod: '4.4.3' } },
    ];

    const { violations } = evaluate(syntheticManifests);

    expect(violations).toContainEqual(expect.stringContaining('@nova/renderer -> "zod"'));
  });

  it('detects a workspace dependency cycle', () => {
    const syntheticManifests = [
      { name: '@nova/a', dir: 'packages/a', dependencies: { '@nova/b': 'workspace:*' } },
      { name: '@nova/b', dir: 'packages/b', dependencies: { '@nova/a': 'workspace:*' } },
    ];

    const { violations } = evaluate(syntheticManifests);

    expect(violations.some((v) => v.startsWith('cycle in workspace dependency graph'))).toBe(true);
  });
});
