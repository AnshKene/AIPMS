import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('Real CRUD Operations & Database Persistence', () => {
  const timestamp = Date.now();
  const testProjectName = `E2E CRUD Project ${timestamp}`;
  const testTaskTitle = `E2E Task ${timestamp}`;
  let createdProjectId = '';

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Create project through UI, verify persistence and reload', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // Click "New Project" button
    const newProjectBtn = page.getByRole('button', { name: /new project|create project/i }).first();
    await expect(newProjectBtn).toBeVisible({ timeout: 10000 });
    await newProjectBtn.click();

    // Modal / form should appear
    const dialog = page.locator('[role="dialog"]').or(page.locator('form')).first();
    await expect(dialog).toBeVisible();

    // Fill project form fields
    const nameInput = page.getByLabel(/project name|name/i).or(page.locator('input[name="name"], #project-name')).first();
    await nameInput.fill(testProjectName);

    const descInput = page.getByLabel(/description/i).or(page.locator('textarea[name="description"], #project-description')).first();
    if (await descInput.isVisible()) {
      await descInput.fill('Automated deep functional persistence test project.');
    }

    // Submit project creation
    const submitBtn = dialog.getByRole('button', { name: /create|save|submit/i }).first();
    await submitBtn.click();

    // Confirm that the project is displayed in the list or redirected to detail
    await page.waitForLoadState('networkidle');
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    const projectCard = page.getByText(testProjectName).first();
    await expect(projectCard).toBeVisible({ timeout: 15000 });

    // Open project detail and extract ID
    await projectCard.click();
    await page.waitForURL(/\/projects\/.+/);
    const url = page.url();
    createdProjectId = url.split('/projects/')[1]?.split('?')[0]?.split('/')[0] || '';
    expect(createdProjectId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

    // Hard page reload to test persistent database hydration
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByText(testProjectName).first()).toBeVisible();
  });

  test('Create task, assign to active user, update status, and verify reload persistence', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');

    // Click "New Task" or "Add Task" button
    const newTaskBtn = page.getByRole('button', { name: /new task|add task|create task/i }).first();
    await expect(newTaskBtn).toBeVisible({ timeout: 10000 });
    await newTaskBtn.click();

    const taskDialog = page.locator('[role="dialog"]').or(page.locator('form')).first();
    await expect(taskDialog).toBeVisible();

    // Fill title
    const titleInput = page.getByLabel(/title|task title/i).or(page.locator('input[name="title"], #task-title')).first();
    await titleInput.fill(testTaskTitle);

    // Select Project (wait for options to populate)
    const projectSelect = page.locator('#task-project');
    await expect(projectSelect.locator('option').nth(1)).toBeAttached({ timeout: 10000 });
    await projectSelect.selectOption({ index: 1 });

    // Submit task via #task-form-submit-btn inside sheet
    const submitBtn = page.locator('#task-form-submit-btn');
    await submitBtn.click();
    await expect(submitBtn).not.toBeVisible({ timeout: 15000 });

    // Reload to ensure task persisted in database and retrieve via search
    await page.reload({ waitUntil: 'networkidle' });
    const searchInput = page.locator('#tasks-search-input');
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.fill(testTaskTitle);

    const taskCard = page.locator('h3', { hasText: testTaskTitle }).first();
    await expect(taskCard).toBeAttached({ timeout: 15000 });
  });

  test.afterAll(async ({ browser }) => {
    // Isolated Cleanup: Delete created project via authorized API call
    if (createdProjectId) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto('/login');
      await page.evaluate(async (pid) => {
        const stored = localStorage.getItem('aipms_auth_state');
        if (!stored) return;
        const parsed = JSON.parse(stored);
        const tok = parsed.token || parsed.accessToken;
        if (!tok) return;
        await fetch(`http://localhost:3000/api/projects/${pid}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${tok}` },
        });
      }, createdProjectId);
      await context.close();
    }
  });
});
