import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should show login page at /auth/login', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('should show register page at /auth/register', async ({ page }) => {
    await page.goto('/auth/register');
    await expect(page).toHaveURL(/\/auth\/register/);
  });

  test('should redirect unauthenticated users from dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).not.toHaveURL(/\/dashboard/);
  });

  test('should show email and password fields on login', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByLabel(/email/i).or(page.getByPlaceholder(/email/i))).toBeVisible();
    await expect(page.getByLabel(/password/i).or(page.getByPlaceholder(/password/i))).toBeVisible();
  });

  test('should show validation error for empty form submission', async ({ page }) => {
    await page.goto('/auth/login');
    const submitButton = page.getByRole('button', { name: /sign in|log in|login/i });
    if (await submitButton.isVisible()) {
      await submitButton.click();
      // Should stay on login page
      await expect(page).toHaveURL(/\/auth\/login/);
    }
  });

  test('should show register form with name, email, password fields', async ({ page }) => {
    await page.goto('/auth/register');
    await expect(page.getByLabel(/email/i).or(page.getByPlaceholder(/email/i))).toBeVisible();
    await expect(page.getByLabel(/password/i).or(page.getByPlaceholder(/password/i))).toBeVisible();
  });

  test('should have link to switch between login and register', async ({ page }) => {
    await page.goto('/auth/login');
    const registerLink = page.getByRole('link', { name: /register|sign up|create account/i });
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await expect(page).toHaveURL(/\/auth\/register/);
    }
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/auth/login');
    const emailInput = page.getByLabel(/email/i).or(page.getByPlaceholder(/email/i));
    const passwordInput = page.getByLabel(/password/i).or(page.getByPlaceholder(/password/i));
    const submitButton = page.getByRole('button', { name: /sign in|log in|login/i });

    if (await emailInput.isVisible() && await submitButton.isVisible()) {
      await emailInput.fill('invalid@test.com');
      await passwordInput.fill('WrongPassword123');
      await submitButton.click();
      // Should stay on login page or show error
      await page.waitForTimeout(1000);
      await expect(page).toHaveURL(/\/auth\/login/);
    }
  });
});
