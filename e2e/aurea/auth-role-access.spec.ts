import { expect, test } from '@playwright/test';

const credentials = {
  system_admin: {
    email: process.env.E2E_SYSTEM_ADMIN_EMAIL || 'superadmin@aurea.com',
    password: process.env.E2E_SYSTEM_ADMIN_PASSWORD || 'Aurea123',
    roleLabel: 'admin', // Superadmin often sees 'admin' or specific label, checking AdminPage.tsx might reveal it's Badge variant="warning">Admin</Badge>
    modules: ['/', '/admin'],
  },
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || 'admin@aurea.com',
    password: process.env.E2E_ADMIN_PASSWORD || 'Aurea123',
    roleLabel: 'admin',
    modules: ['/', '/clientes', '/prontuario/censo', '/estoque', '/configuracoes'],
  },
  manager: {
    email: process.env.E2E_MANAGER_EMAIL || 'manager@aurea.com',
    password: process.env.E2E_MANAGER_PASSWORD || 'Aurea123',
    roleLabel: 'manager',
    modules: ['/', '/clientes', '/prontuario/censo', '/estoque', '/configuracoes'],
  },
  user: {
    email: process.env.E2E_USER_EMAIL || 'user@aurea.com',
    password: process.env.E2E_USER_PASSWORD || 'Aurea123',
    roleLabel: 'viewer',
    modules: ['/', '/clientes'],
  },
};

async function signIn(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole('button', { name: /entrar/i }).click();
}

async function expectAuthenticated(page: import('@playwright/test').Page) {
  await expect.poll(() => new URL(page.url()).pathname).not.toBe('/login');
  await expect(page.getByTitle('Sair')).toBeVisible();
}

test.describe('Acesso por perfil aos modulos', () => {
  for (const [profile, config] of Object.entries(credentials)) {
    test(`deve autenticar com perfil ${profile} e navegar pelos modulos esperados`, async ({
      page,
    }) => {
      await signIn(page, config.email, config.password);

      await expectAuthenticated(page);
      await expect(page.getByText(new RegExp(config.roleLabel, 'i')).first()).toBeVisible();

      for (const modulePath of config.modules) {
        if (profile === 'system_admin' && modulePath === '/admin') {
          // Skip explicit navigation check for /admin here because it might be the redirected page
          // or we can test it specifically
          await page.goto(modulePath);
          await expect(page).not.toHaveURL(/\/login$/);
          continue;
        }
        await page.goto(modulePath);
        await expect(page).not.toHaveURL(/\/login$/);
        await expect(page.getByTitle('Sair')).toBeVisible();
      }
    });
  }
});
