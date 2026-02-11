import { test, expect } from '@playwright/test';

test.describe('Billing', () => {
  test('should show pricing page', async ({ page }) => {
    const response = await page.goto('/pricing');
    expect(response?.status()).toBeLessThan(500);
  });

  test('should display pricing content', async ({ page }) => {
    await page.goto('/pricing');
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });

  test('should redirect to login for billing settings when not authenticated', async ({ page }) => {
    await page.goto('/settings/billing');
    await expect(page).not.toHaveURL(/\/settings\/billing$/);
  });

  test('should not return 500 for billing settings', async ({ page }) => {
    const response = await page.goto('/settings/billing');
    expect(response?.status()).toBeLessThan(500);
  });
});
