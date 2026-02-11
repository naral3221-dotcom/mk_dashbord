import { test, expect } from '@playwright/test';

test.describe('Integrations', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/integrations');
    await expect(page).not.toHaveURL(/\/integrations$/);
  });

  test('should not return 500 for integrations page', async ({ page }) => {
    const response = await page.goto('/integrations');
    expect(response?.status()).toBeLessThan(500);
  });

  test('should handle direct URL access gracefully', async ({ page }) => {
    const response = await page.goto('/integrations');
    expect(response).toBeTruthy();
  });

  test('should have page content or redirect', async ({ page }) => {
    await page.goto('/integrations');
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });
});
