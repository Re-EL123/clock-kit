import { test, expect } from '@playwright/test';

test('login screen shows Clock-Kit sign in', async ({ page }) => {
  await page.goto('/login.html');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
});

test('offline fallback page is reachable', async ({ page }) => {
  await page.goto('/offline.html');
  await expect(page.getByRole('heading', { name: 'You’re offline' })).toBeVisible();
});
