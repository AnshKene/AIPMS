import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

const ROUTES_TO_TEST = [
  { path: '/dashboard', titleMatch: /Dashboard|AIPMS/i, headingMatch: /Dashboard|Overview|Welcome/i },
  { path: '/projects', titleMatch: /Projects|AIPMS/i, headingMatch: /Projects/i },
  { path: '/tasks', titleMatch: /Tasks|AIPMS/i, headingMatch: /Tasks/i },
  { path: '/teams', titleMatch: /Teams|AIPMS/i, headingMatch: /Teams|Directory/i },
  { path: '/sprints', titleMatch: /Sprints|AIPMS/i, headingMatch: /Sprints|Backlog/i },
  { path: '/risks', titleMatch: /Risks|AIPMS/i, headingMatch: /Risk/i },
  { path: '/reports', titleMatch: /Reports|Analytics|AIPMS/i, headingMatch: /Report|Analytics/i },
  { path: '/users', titleMatch: /Users|Directory|AIPMS/i, headingMatch: /User|Directory/i },
  { path: '/admin/overview', titleMatch: /Admin|Overview|AIPMS/i, headingMatch: /Admin|System/i },
  { path: '/admin/users', titleMatch: /User Management|Admin|AIPMS/i, headingMatch: /User Management/i },
  { path: '/admin/audit-logs', titleMatch: /Audit|Logs|AIPMS/i, headingMatch: /Audit/i },
  { path: '/admin/health', titleMatch: /Health|Services|AIPMS/i, headingMatch: /Health|Service/i },
  { path: '/admin/workspaces', titleMatch: /Workspaces|AIPMS/i, headingMatch: /Workspace/i },
];

test.describe('Route Inventory & Navigation Integrity', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  for (const route of ROUTES_TO_TEST) {
    test(`Route ${route.path} loads successfully without critical JS error`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');

      // Verify no critical uncaught exception crashed the page
      const errorBoundary = page.locator('text=Application error: a client-side exception has occurred');
      await expect(errorBoundary).not.toBeVisible();

      // Verify main container is visible
      const main = page.locator('main').first();
      await expect(main).toBeVisible();

      // Check heading exists
      const heading = page.locator('h1, h2').first();
      await expect(heading).toBeVisible();
    });
  }
});
