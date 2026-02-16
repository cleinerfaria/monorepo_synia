import { test, expect } from '@playwright/test';

const email = process.env.E2E_SYSTEM_ADMIN_EMAIL || 'superadmin@aurea.com';
const password = process.env.E2E_SYSTEM_ADMIN_PASSWORD || 'Aurea123';

function generateCNPJ() {
  const n = 9;
  const n1 = Math.floor(Math.random() * n);
  const n2 = Math.floor(Math.random() * n);
  const n3 = Math.floor(Math.random() * n);
  const n4 = Math.floor(Math.random() * n);
  const n5 = Math.floor(Math.random() * n);
  const n6 = Math.floor(Math.random() * n);
  const n7 = Math.floor(Math.random() * n);
  const n8 = Math.floor(Math.random() * n);
  const n9 = 0; // Matriz
  const n10 = 0; // Matriz
  const n11 = 0; // Matriz
  const n12 = 1; // Matriz

  let d1 =
    n12 * 2 +
    n11 * 3 +
    n10 * 4 +
    n9 * 5 +
    n8 * 6 +
    n7 * 7 +
    n6 * 8 +
    n5 * 9 +
    n4 * 2 +
    n3 * 3 +
    n2 * 4 +
    n1 * 5;
  d1 = 11 - (d1 % 11);
  if (d1 >= 10) d1 = 0;

  let d2 =
    d1 * 2 +
    n12 * 3 +
    n11 * 4 +
    n10 * 5 +
    n9 * 6 +
    n8 * 7 +
    n7 * 8 +
    n6 * 9 +
    n5 * 2 +
    n4 * 3 +
    n3 * 4 +
    n2 * 5 +
    n1 * 6;
  d2 = 11 - (d2 % 11);
  if (d2 >= 10) d2 = 0;

  return `${n1}${n2}.${n3}${n4}${n5}.${n6}${n7}${n8}/${n9}${n10}${n11}${n12}-${d1}${d2}`;
}

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

    // Gerar CNPJ dinâmico
    const cnpj = generateCNPJ();
    console.log(`CNPJ Gerado para o teste: ${cnpj}`);
    await page.getByPlaceholder('00.000.000/0000-00').fill(cnpj);

    // Salvar
    await page.getByRole('button', { name: /criar empresa/i }).click();

    // 5. Verificar sucesso
    // Espera modal fechar e empresa aparecer na lista
    await expect(page.getByRole('heading', { name: /nova empresa/i })).not.toBeVisible();

    // Use precise matching for the success verification to avoid strict mode violation
    // because trade_name matches partial text of company_name often or similar layout
    // getByRole('heading') targets the card title specifically
    await expect(page.getByRole('heading', { name: companyName, exact: true })).toBeVisible();
  });
});
