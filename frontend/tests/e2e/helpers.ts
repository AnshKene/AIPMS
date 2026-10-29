import { Page } from '@playwright/test';

export async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  
  // If already logged in, the auth context redirects away from /login
  try {
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 2500 });
    return;
  } catch {
    // Still on login page, proceed to fill form
  }

  const emailInput = page.locator('#login-email');
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  await emailInput.fill('admin.ansh@aipms.com');
  await page.locator('#login-password').fill('abc@12345');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 });
  await page.waitForLoadState('domcontentloaded');
}
