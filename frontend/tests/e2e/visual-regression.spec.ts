import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('Visual Regression & Multi-Viewport Baselines', () => {
  const VIEWPORTS = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'laptop', width: 1280, height: 800 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 390, height: 844 },
  ];

  for (const vp of VIEWPORTS) {
    test(`Landing Page visual presentation at ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Capture screenshot to visual-baselines directory
      await page.screenshot({
        path: `test-results/visual-baselines/landing-${vp.name}.png`,
        fullPage: false,
      });
      // Confirm hero element is visible
      await expect(page.locator('h1').first()).toBeVisible();
    });

    test(`Login Page visual presentation at ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/login');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.reload({ waitUntil: 'networkidle' });

      await page.screenshot({
        path: `test-results/visual-baselines/login-${vp.name}.png`,
        fullPage: false,
      });
      await expect(page.locator('#login-email')).toBeVisible();
    });

    test(`Dashboard visual presentation at ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await loginAsAdmin(page);
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: `test-results/visual-baselines/dashboard-${vp.name}.png`,
        fullPage: false,
      });
      await expect(page.locator('main').first()).toBeVisible();
    });

    test(`Admin Users Directory at ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await loginAsAdmin(page);
      await page.goto('/admin/users');
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: `test-results/visual-baselines/admin-users-${vp.name}.png`,
        fullPage: false,
      });
      await expect(page.locator('main').first()).toBeVisible();
    });
  }
});
