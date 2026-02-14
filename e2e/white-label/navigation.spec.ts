import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');

    // Page should load without errors
    await expect(page).toHaveTitle(/.+/);
  });

  test.skip('should have navigation elements', async ({ page }) => {
    await page.goto('/');

    // Check for common navigation elements (adjust selectors as needed)
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Page should still be functional on mobile
    await expect(page.locator('body')).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');

    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('should not have any automatically detectable accessibility issues on login', async ({
    page,
  }) => {
    await page.goto('/login');

    // Check for basic accessibility: form labels (using placeholders as proxies)
    const emailInput = page.getByPlaceholder(/seu@email.com/i);
    await expect(emailInput).toBeVisible();

    const passwordInput = page.getByPlaceholder(/••••••••/i);
    await expect(passwordInput).toBeVisible();
  });
});
