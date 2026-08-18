import { defineConfig } from 'vitest/config';

// Foundation-ticket config: one project per workspace package, all
// currently empty except tests/, which holds the boundary-checker spec.
// `passWithNoTests` is intentionally scoped to the not-yet-populated
// package projects only — the `tests` project must always have at least
// one real test, so an accidental deletion of the boundary spec fails CI
// instead of reporting a silent pass.
const emptyPackageProjects = [
  'packages/shared',
  'packages/astronomy',
  'packages/renderer',
  'apps/api',
  'apps/web',
].map((root) => ({
  test: {
    name: root,
    root,
    environment: 'node',
    passWithNoTests: true,
    include: ['**/*.{test,spec}.ts'],
  },
}));

export default defineConfig({
  test: {
    projects: [
      ...emptyPackageProjects,
      {
        test: {
          name: 'tests',
          root: 'tests',
          environment: 'node',
          include: ['**/*.{test,spec}.ts'],
          // tests/e2e/**/*.spec.ts are Playwright specs, run only via
          // `pnpm test:e2e`; Playwright's `test()` is not a Vitest test.
          exclude: ['e2e/**'],
        },
      },
    ],
  },
});
