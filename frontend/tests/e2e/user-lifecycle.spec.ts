import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('User Lifecycle Management & Admin Controls', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
  });

  test('User directory renders active system users with role and status badges', async ({ page }) => {
    // Check that table rows or user cards are rendered
    const userRows = page.locator('table tbody tr, .grid > div, [role="row"]');
    await expect(userRows.first()).toBeVisible({ timeout: 10000 });

    // Designated admin Ansh should be visible in directory
    await expect(page.getByText(/admin\.ansh@aipms\.com/i).first()).toBeVisible();
  });

  test('Role change modal opens and cancel preserves state', async ({ page }) => {
    // Find edit role button for a user (not self if self disabled)
    const roleButtons = page.getByRole('button', { name: /edit role|change role/i });
    if (await roleButtons.count() > 0) {
      await roleButtons.first().click();
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();
      // Click cancel
      const cancelBtn = dialog.getByRole('button', { name: /cancel/i });
      await cancelBtn.click();
      await expect(dialog).not.toBeVisible();
    }
  });

  test('Deactivate User Dialog opens with policy notice and cancel works', async ({ page }) => {
    // Find deactivate button for a non-admin user
    const deactivateButtons = page.getByRole('button', { name: /deactivate/i });
    const count = await deactivateButtons.count();

    if (count > 0) {
      // Click the first enabled deactivate button
      let clicked = false;
      for (let i = 0; i < count; i++) {
        const btn = deactivateButtons.nth(i);
        if (await btn.isEnabled()) {
          await btn.click();
          clicked = true;
          break;
        }
      }

      if (clicked) {
        const dialog = page.locator('[role="dialog"]');
        await expect(dialog).toBeVisible();
        await expect(dialog.getByText(/deactivation policy|data retention/i)).toBeVisible();

        // Verify Cancel button closes cleanly
        const cancelBtn = dialog.getByRole('button', { name: /cancel/i });
        await cancelBtn.click();
        await expect(dialog).not.toBeVisible();
      }
    }
  });

  test('Designated Root Administrator account cannot be deactivated or deleted', async ({ page }) => {
    // Locate the row for admin.ansh@aipms.com
    const adminRow = page.locator('tr, [role="row"]').filter({ hasText: 'admin.ansh@aipms.com' });
    await expect(adminRow).toBeVisible();

    // The deactivate button in the admin row should either be disabled or hidden
    const deactivateBtn = adminRow.getByRole('button', { name: /deactivate/i });
    if (await deactivateBtn.count() > 0) {
      await expect(deactivateBtn).toBeDisabled();
    }

    // The delete button in the admin row should either be disabled or hidden
    const deleteBtn = adminRow.getByRole('button', { name: /delete/i });
    if (await deleteBtn.count() > 0) {
      await expect(deleteBtn).toBeDisabled();
    }
  });

  test('Global role badges and workspace ownership counts render correctly for system users', async ({ page }) => {
    // Locate the row for admin.ansh@aipms.com
    const adminRow = page.locator('tr, [role="row"]').filter({ hasText: 'admin.ansh@aipms.com' });
    await expect(adminRow).toBeVisible();

    // Verify system admin row displays designated admin indicator
    await expect(adminRow.getByText(/System Owner|Admin/i).first()).toBeVisible();

    // Verify workspace ownership column is rendered in table
    const tableHeader = page.locator('th').filter({ hasText: /Workspaces Owned/i });
    await expect(tableHeader).toBeVisible();

    // Verify project owner rows show owned project counts where applicable
    const projectCountCells = page.locator('td').filter({ hasText: /project/i });
    await expect(projectCountCells.first()).toBeVisible();
  });
});

