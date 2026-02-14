/**
 * Teste E2E: Criação de Instância WhatsApp
 *
 * Para análise completa do fluxo (incl. chamadas uazapi-proxy), configure:
 *   TEST_USER_EMAIL=seu@email.com
 *   TEST_USER_PASSWORD=suasenha
 *
 * Exemplo PowerShell:
 *   $env:TEST_USER_EMAIL="user@email.com"; $env:TEST_USER_PASSWORD="senha"; npm run test:e2e -- e2e/whatsapp-instance-create.spec.ts
 *
 * As requisições e respostas do uazapi-proxy são logadas no console.
 */
import { test, expect } from '@playwright/test';

test.describe('Criação de Instância WhatsApp', () => {
  const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'cleinerfaria@gmail.com';
  const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'Amesma22';
  const USE_REAL_AUTH = !!(TEST_EMAIL && TEST_PASSWORD && TEST_EMAIL !== 'test@example.com');
  const INSTANCE_NAME = `test-instance-${Date.now()}`;

  test.beforeEach(async ({ page }) => {
    // Interceptar chamadas ao uazapi-proxy para análise
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('uazapi-proxy')) {
        console.log(
          `[uazapi-proxy] REQUEST: ${request.method()} | headers: ${JSON.stringify(
            Object.fromEntries(
              [...request.headers()].filter(([k]) =>
                ['authorization', 'apikey', 'content-type'].includes(k.toLowerCase())
              )
            )
          )} | body: ${request.postData() || 'none'}`
        );
      }
    });
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('uazapi-proxy')) {
        const status = response.status();
        let body = '';
        try {
          body = await response.text();
        } catch {
          body = '(não legível)';
        }
        console.log(`[uazapi-proxy] RESPONSE: ${status} | body: ${body.substring(0, 300)}`);
      }
    });
  });

  async function loginReal(page: import('@playwright/test').Page) {
    await page.goto('/login');
    await page.getByPlaceholder(/seu@email.com/i).fill(TEST_EMAIL);
    await page.getByPlaceholder(/••••••••/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /entrar|login|acessar/i }).click();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
    // Se estiver em /admin (superadmin), clicar em uma empresa para entrar
    await page.waitForURL(/\/(admin|$|\/)/, { timeout: 5000 }).catch(() => {});
    if (page.url().includes('/admin')) {
      await page.getByText('AquaCoco', { exact: true }).click();
      await page.waitForURL((url) => !url.includes('/admin'), { timeout: 15000 });
    }
  }

  async function loginMocked(page: import('@playwright/test').Page) {
    await page.route('**/auth/v1/token*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'fake-jwt-for-analysis',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'fake-refresh',
          user: {
            id: 'fake-user-id',
            aud: 'authenticated',
            role: 'authenticated',
            email: TEST_EMAIL,
            email_confirmed_at: new Date().toISOString(),
            phone: '',
            last_sign_in_at: new Date().toISOString(),
            app_metadata: { provider: 'email', providers: ['email'] },
            user_metadata: {},
            identities: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        }),
      });
    });
    await page.route('**/rest/v1/app_user*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'fake-app-user-id',
            auth_user_id: 'fake-user-id',
            company_id: 'fake-company-id',
            name: 'Test User',
            email: TEST_EMAIL,
            active: true,
            access_profile_id: 'fake-profile-id',
            access_profile: { id: 'fake-profile-id', code: 'admin', name: 'Admin', is_admin: true },
          },
        ]),
      });
    });
    const fakeProfile = {
      id: 'fake-profile-id',
      code: 'admin',
      name: 'Admin',
      is_admin: true,
      company_id: null,
      description: null,
      is_system: true,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await page.route('**/rest/v1/access_profile*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([fakeProfile]),
      });
    });
    await page.route('**/rest/v1/access_profile_permission*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });
    await page.route('**/rpc/get_user_permissions**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            module_code: 'whatsapp',
            module_name: 'WhatsApp',
            permission_code: 'manage_instances',
            permission_name: 'Gerenciar instâncias',
          },
        ]),
      });
    });
    await page.route('**/rest/v1/company*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ id: 'fake-company-id', name: 'Test Company', active: true }]),
        });
      } else {
        await route.continue();
      }
    });
    await page.route('**/rest/v1/whatsapp_instance*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });
    await page.route('**/rest/v1/company_plan_settings*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ whatsapp_instance_limit: 5 }]),
      });
    });
    await page.goto('/login');
    await page.getByPlaceholder(/seu@email.com/i).fill(TEST_EMAIL);
    await page.getByPlaceholder(/••••••••/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /entrar|login|acessar/i }).click();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
  }

  test('deve fazer login e abrir página de instâncias', async ({ page }) => {
    if (USE_REAL_AUTH) {
      await loginReal(page);
    } else {
      await loginMocked(page);
    }
    await page.goto('/whatsapp/instances');
    await expect(page.getByRole('heading', { name: /inst[aâ]ncias/i })).toBeVisible({
      timeout: 15000,
    });
  });

  test('deve abrir modal Nova Instância e preencher formulário', async ({ page }) => {
    test.skip(!USE_REAL_AUTH, 'Requer TEST_USER_EMAIL e TEST_USER_PASSWORD para testar criação');
    await loginReal(page);
    await page.goto('/whatsapp/instances');
    await expect(page.getByRole('heading', { name: /inst[aâ]ncias/i })).toBeVisible({
      timeout: 15000,
    });

    // Clicar em Nova instância (header ou empty state)
    await page
      .getByTestId('new-instance-btn')
      .or(page.getByTestId('new-instance-btn-empty'))
      .first()
      .click();

    // Verificar modal aberto
    await expect(page.getByRole('heading', { name: /nova instância/i })).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByPlaceholder(/atendimento-comercial/i)).toBeVisible();

    // Preencher nome
    await page.getByPlaceholder(/atendimento-comercial/i).fill(INSTANCE_NAME);
  });

  test('deve submeter criação e analisar resposta', async ({ page }) => {
    test.skip(!USE_REAL_AUTH, 'Requer TEST_USER_EMAIL e TEST_USER_PASSWORD para testar criação');
    await loginReal(page);
    await page.goto('/whatsapp/instances');
    await expect(page.getByRole('heading', { name: /inst[aâ]ncias/i })).toBeVisible({
      timeout: 15000,
    });

    await page
      .getByTestId('new-instance-btn')
      .or(page.getByTestId('new-instance-btn-empty'))
      .first()
      .click();
    await expect(page.getByRole('heading', { name: /nova instância/i })).toBeVisible({
      timeout: 5000,
    });

    await page.getByPlaceholder(/atendimento-comercial/i).fill(INSTANCE_NAME);
    await page.getByRole('button', { name: /criar instância/i }).click();

    await expect(page.getByText(/instância criada com sucesso/i)).toBeVisible({ timeout: 30000 });
  });
});
