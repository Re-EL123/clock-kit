import { test, expect } from '@playwright/test';

test('kiosk shows clock actions', async ({ page }) => {
  await page.goto('/kiosk/');
  await expect(page.getByRole('heading', { name: 'CLOCK-KIT' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'CLOCK IN' })).toBeVisible();
});
