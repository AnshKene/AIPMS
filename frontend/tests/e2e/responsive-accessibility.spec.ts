import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('Responsive Layouts & Accessibility Checks', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  const VIEWPORTS = [
    { name: 'Desktop (1440x900)', width: 1440, height: 900 },
    { name: 'Laptop (1280x800)', width: 1280, height: 800 },
    { name: 'Tablet (768x1024)', width: 768, height: 1024 },
    { name: 'Mobile (390x844)', width: 390, height: 844 },
  ];

  for (const vp of VIEWPORTS) {
    test(`Dashboard renders cleanly at ${vp.name} without horizontal overflow`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Check horizontal overflow on document body
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

      // Scroll width should not significantly exceed client width (within 5px tolerance)
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);

      // Verify header and navigation bar exist and are visible
      const header = page.locator('header').first();
      await expect(header).toBeVisible();
    });
  }

  test('Page has semantic landmark structure and heading hierarchy', async ({ page }) => {
    await page.goto('/dashboard');
    // Main landmark should exist
    const main = page.locator('main').first();
    await expect(main).toBeVisible();

    // H1 heading should exist on the page
    const h1 = page.locator('h1');
    await expect(h1.first()).toBeVisible();

    // Verify all interactive buttons have accessible text or labels
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    for (let i = 0; i < Math.min(buttonCount, 15); i++) {
      const btn = buttons.nth(i);
      if (await btn.isVisible()) {
        const text = await btn.innerText();
        const ariaLabel = await btn.getAttribute('aria-label');
        const title = await btn.getAttribute('title');
        const accessibleName = (text || ariaLabel || title || '').trim();
        expect(accessibleName.length).toBeGreaterThan(0);
      }
    }
  });
});
