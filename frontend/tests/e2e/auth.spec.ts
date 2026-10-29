import { test, expect } from '@playwright/test';

test.describe('Authentication & Access Control', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
  });

  test('Landing page renders branding, headline, and auth links', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/AIPMS|Project Management/i);
    const getStartedBtn = page.getByRole('link', { name: /sign in|get started|dashboard|log in/i }).first();
    await expect(getStartedBtn).toBeVisible();
  });

  test('Login page renders accessible inputs and validates required fields', async ({ page }) => {
    await page.goto('/login');
    const emailInput = page.locator('#login-email');
    const passwordInput = page.locator('#login-password');
    const submitBtn = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();

    // Attempt submission with empty fields
    await submitBtn.click();
    // HTML5 validation or form error
    const isValid = await emailInput.evaluate((el: HTMLInputElement) => el.checkValidity());
    expect(isValid).toBe(false);
  });

  test('Login with invalid credentials displays error notice', async ({ page }) => {
    await page.goto('/login');
    const emailInput = page.locator('#login-email');
    const passwordInput = page.locator('#login-password');
    const submitBtn = page.locator('button[type="submit"]');

    await emailInput.fill('invalid-user@aipms.com');
    await passwordInput.fill('WrongPassword123!');
    await submitBtn.click();

    // Verify error notification or banner
    const errorBanner = page.locator('[role="alert"]').first();
    await expect(errorBanner).toBeVisible({ timeout: 10000 });
  });

  test('Designated Admin authenticates and accesses dashboard', async ({ page }) => {
    await page.goto('/login');
    const emailInput = page.locator('#login-email');
    const passwordInput = page.locator('#login-password');
    const submitBtn = page.locator('button[type="submit"]');

    await emailInput.fill('admin.ansh@aipms.com');
    await passwordInput.fill('abc@12345');
    await submitBtn.click();

    // Should redirect to dashboard or admin
    await page.waitForURL(/.*(dashboard|admin).*/, { timeout: 15000 });
    expect(page.url()).toMatch(/(dashboard|admin)/);
  });
});
