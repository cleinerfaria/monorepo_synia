import { test, expect } from '@playwright/test';

const email =
  process.env.E2E_ADMIN_EMAIL || process.env.E2E_USER_EMAIL || 'e2e.admin@vidasystem.local';
const password = process.env.E2E_ADMIN_PASSWORD || process.env.E2E_USER_PASSWORD || 'AureaE2E!123';

async function expectAuthenticated(page: import('@playwright/test').Page) {
  await expect.poll(() => new URL(page.url()).pathname).not.toBe('/login');
  await expect(page.getByTitle('Sair')).toBeVisible();
}

test.describe('Fluxo de autenticacao', () => {
  test('deve manter na tela de login com credenciais invalidas', async ({ page }) => {
    await page.goto('/login');

    await page.locator('input[type="email"]').fill('usuario.invalido@vidasystem.local');
    await page.locator('input[type="password"]').first().fill('senha-invalida-123');
    await page.getByRole('button', { name: /entrar/i }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText(/credenciais/i)).toBeVisible();
  });

  test('deve autenticar com usuario de teste e acessar o dashboard', async ({ page }) => {
    console.log(`[TEST] Tentando login com: ${email}`);
    await page.goto('/login');

    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').first().fill(password);
    await page.getByRole('button', { name: /entrar/i }).click();

    await expectAuthenticated(page);
  });

  test('deve abrir a tela de recuperar senha', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('button', { name: /esqueci minha senha/i }).click();

    const recoveryModal = page.locator('div.fixed.inset-0');

    await expect(page.getByRole('heading', { name: /recuperar senha/i })).toBeVisible();
    await expect(recoveryModal.locator('input[type="email"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /enviar e-mail/i })).toBeVisible();
  });
});
