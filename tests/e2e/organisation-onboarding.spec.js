import { test, expect } from '@playwright/test';

test('organisation panel redirects unauthenticated users', async ({ page }) => {
  await page.goto('/organisation/');
  await expect(page).toHaveURL(/login\.html/);
});
