import { defineConfig } from '@playwright/test';

// Foundation-ticket config: one Chromium project running a placeholder
// smoke spec against the built app. The full desktop Chrome/Firefox/Safari
// support matrix belongs to the rendering ticket that adds real UI.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  webServer: {
    command: 'pnpm --filter @nova/web preview --port 4173 --strictPort',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  use: {
    baseURL: 'http://localhost:4173',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
