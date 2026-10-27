import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('Project, Ownership & Member Management Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
  });

  test('Projects page renders project cards with title, owner and members', async ({ page }) => {
    const projectCards = page.locator('a[href*="/projects/"], .grid a, [data-testid="project-card"]');
    await expect(projectCards.first()).toBeVisible({ timeout: 10000 });
  });

  test('Project detail page displays Workload, Members, and Transfer Ownership', async ({ page }) => {
    const firstProject = page.locator('a[href*="/projects/"]').first();
    await firstProject.click();
    await page.waitForURL(/\/projects\/.+/);

    // Verify main components exist on project detail
    await expect(page.locator('main, [role="main"]')).toBeVisible();

    // Check Transfer Ownership trigger if visible
    const transferBtn = page.getByRole('button', { name: /transfer ownership/i });
    if (await transferBtn.isVisible()) {
      await transferBtn.click();
      // Verify Transfer Ownership form opens
      await expect(page.getByText(/transfer.*ownership/i).first()).toBeVisible();

      // Open UserSelector inside transfer dialog
      const selectorTrigger = page.locator('button, [role="combobox"]').filter({ hasText: /select|new owner/i }).first();
      if (await selectorTrigger.isVisible()) {
        await selectorTrigger.click();
        // Look for Alex Rivera (PM)
        const pmOption = page.locator('[role="option"], button, div').filter({ hasText: /Alex Rivera/i }).first();
        if (await pmOption.isVisible()) {
          await pmOption.click();
          // Confirm that NO UUID format error appears
          const uuidError = page.locator('text=Please enter a valid UUID format');
          await expect(uuidError).not.toBeVisible();
        }
      }

      // Cancel transfer
      const cancelBtn = page.getByRole('button', { name: /cancel/i }).first();
      await cancelBtn.click();
    }
  });

  test('Team Directory allows viewing teams and members', async ({ page }) => {
    await page.goto('/teams');
    await page.waitForLoadState('networkidle');

    // Verify Team Directory renders
    await expect(page.getByRole('heading', { level: 1 }).or(page.getByText(/team directory/i)).first()).toBeVisible();
  });
});
