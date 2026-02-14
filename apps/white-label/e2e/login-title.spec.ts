import { expect, test } from '@playwright/test';

test.describe('Login Title Branding', () => {
  test('should apply document title from system_settings.name', async ({ page }) => {
    await page.route('**/rest/v1/system_settings*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '00000000-0000-0000-0000-000000000001',
          name: 'Minha Marca',
          basic_color: '#1aa2ff',
          logo_login_light: null,
          logo_login_dark: null,
          login_frase: 'Sistema de gestao de empresas',
          favicon: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
    });

    await page.goto('/login');

    await expect(page).toHaveTitle(/Minha Marca/i);
  });
});
