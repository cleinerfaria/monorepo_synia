import { test, expect } from '@playwright/test';

const email = process.env.E2E_SYSTEM_ADMIN_EMAIL || 'superadmin@aurea.com';
const password = process.env.E2E_SYSTEM_ADMIN_PASSWORD || 'Aurea123';

test.describe('Fluxo Superadmin', () => {
  test('deve logar como superadmin, acessar admin e criar empresa', async ({ page }) => {
    // 1. Login
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').first().fill(password);
    await page.getByRole('button', { name: /entrar/i }).click();

    // 2. Verificar redirecionamento (Superadmin vai para /admin?)
    // Se for para dashboard primeiro, precisa navegar para /admin
    // Assumindo que o superadmin tem acesso direto ou link para /admin.
    // Vamos tentar ir direto para /admin para garantir ou verificar se já está lá.
    await expect(page).not.toHaveURL(/\/login$/);

    // Se não estiver em /admin, navega
    if (!page.url().includes('/admin')) {
      await page.goto('/admin');
    }

    // 3. Verificar se está na página de admin e tem botão Nova Empresa
    await expect(page.getByRole('heading', { name: /administração do sistema/i })).toBeVisible();

    const novaEmpresaBtn = page.getByRole('button', { name: /nova empresa/i });
    await expect(novaEmpresaBtn).toBeVisible();
    await novaEmpresaBtn.click();

    // 4. Preencher formulário de Nova Empresa
    const companyName = `Empresa Teste ${Date.now()}`;
    await expect(page.getByRole('heading', { name: /nova empresa/i })).toBeVisible();

    await page.getByPlaceholder('Nome da empresa').fill(companyName);
    await page.getByPlaceholder('Nome fantasia').fill(companyName + ' Ltda');
    await page.getByPlaceholder('00.000.000/0000-00').fill('12.345.678/0001-90'); // CNPJ Fictício mas com formato

    // Salvar
    await page.getByRole('button', { name: /criar empresa/i }).click();

    // 5. Verificar sucesso
    // Espera modal fechar e empresa aparecer na lista
    await expect(page.getByRole('heading', { name: /nova empresa/i })).not.toBeVisible();
    await expect(page.getByText(companyName)).toBeVisible();
  });
});
