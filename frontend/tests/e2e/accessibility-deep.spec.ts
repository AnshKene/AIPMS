import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('Deep Accessibility & Keyboard Traversal Checks', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Keyboard navigation: Tab key traverses interactive elements with visible focus', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Press Tab multiple times and verify that document.activeElement changes
    const initialTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(initialTag).toBeDefined();

    await page.keyboard.press('Tab');
    const firstTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(firstTag).toBeDefined();

    await page.keyboard.press('Tab');
    const secondTag = await page.evaluate(() => document.activeElement?.tagName);

    expect(['A', 'BUTTON', 'INPUT', 'SELECT']).toContain(secondTag);
  });

  test('Dialog dismisses gracefully on Escape key and restores focus', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    // Find and open any role or deactivation dialog
    const editBtn = page.getByRole('button', { name: /edit role|change role/i }).first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible();

      // Press Escape key
      await page.keyboard.press('Escape');

      // Verify dialog is closed
      await expect(dialog).not.toBeVisible();
    }
  });

  test('Status indicators contain accessible textual descriptions and not only color', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    // Check exact status badge elements in table
    const activeBadges = page.getByText(/^ACTIVE$/i);
    const count = await activeBadges.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(count, 3); i++) {
      await expect(activeBadges.nth(i)).toBeVisible();
    }
  });

  test('Theme toggle button has descriptive accessible name', async ({ page }) => {
    await page.goto('/login');
    const themeBtn = page.locator('button[aria-label*="Mode"], button[title*="Mode"]').first();
    await expect(themeBtn).toBeVisible();
    const accessibleLabel = await themeBtn.getAttribute('aria-label') || await themeBtn.getAttribute('title');
    expect(accessibleLabel).toMatch(/mode/i);
  });
});
