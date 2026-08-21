import { expect, test } from '@playwright/test';

// Placeholder E2E smoke spec for ticket T-001: it exercises the whole
// build-and-serve path (vite build -> vite preview -> Playwright) while
// adding no product behaviour. Chromium only for now; the desktop
// Chrome/Firefox/Safari support matrix is added by a later rendering ticket.
test('the built app loads and mounts #root', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#root')).toBeVisible();
});
