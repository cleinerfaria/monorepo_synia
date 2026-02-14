import { expect, test } from '@playwright/test'

const credentials = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || 'e2e.admin@aurea.local',
    password: process.env.E2E_ADMIN_PASSWORD || 'AureaE2E!123',
    roleLabel: 'admin',
    modules: ['/', '/clientes', '/prontuario/censo', '/estoque', '/configuracoes', '/admin'],
  },
  manager: {
    email: process.env.E2E_MANAGER_EMAIL || 'e2e.manager@aurea.local',
    password: process.env.E2E_MANAGER_PASSWORD || 'AureaE2E!123',
    roleLabel: 'manager',
    modules: ['/', '/clientes', '/prontuario/censo', '/estoque', '/configuracoes'],
  },
  user: {
    email: process.env.E2E_USER_EMAIL || 'e2e.user@aurea.local',
    password: process.env.E2E_USER_PASSWORD || 'AureaE2E!123',
    roleLabel: 'viewer',
    modules: ['/', '/clientes', '/prontuario/censo', '/estoque', '/configuracoes'],
  },
}

async function signIn(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  await page.getByRole('button', { name: /entrar/i }).click()
}

async function expectAuthenticated(page: import('@playwright/test').Page) {
  await expect.poll(() => new URL(page.url()).pathname).not.toBe('/login')
  await expect(page.getByTitle('Sair')).toBeVisible()
}

test.describe('Acesso por perfil aos modulos', () => {
  for (const [profile, config] of Object.entries(credentials)) {
    test(`deve autenticar com perfil ${profile} e navegar pelos modulos esperados`, async ({
      page,
    }) => {
      await signIn(page, config.email, config.password)

      await expectAuthenticated(page)
      await expect(page.getByText(new RegExp(config.roleLabel, 'i')).first()).toBeVisible()

      for (const modulePath of config.modules) {
        await page.goto(modulePath)
        await expect(page).not.toHaveURL(/\/login$/)
        await expect(page.getByTitle('Sair')).toBeVisible()
      }
    })
  }
})
