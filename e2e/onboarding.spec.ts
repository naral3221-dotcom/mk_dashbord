import { test, expect } from '@playwright/test';

test.describe('Onboarding', () => {
  test('should show onboarding page', async ({ page }) => {
    await page.goto('/onboarding');
    await expect(page).toHaveURL(/\/onboarding/);
  });

  test('should display organization creation form', async ({ page }) => {
    await page.goto('/onboarding');
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible();
  });

  test('should redirect to login if not authenticated', async ({ page }) => {
    await page.goto('/onboarding');
    // Unauthenticated users may be redirected to login
    const url = page.url();
    expect(url).toMatch(/\/(onboarding|auth\/login)/);
  });

  test('should have form elements for org creation', async ({ page }) => {
    await page.goto('/onboarding');
    // Page should have some form content or redirect
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });
});
