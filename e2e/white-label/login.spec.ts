import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');

    // Verify login form elements are present
    // Banner side might have a heading, but form side usually has just the form or logo
    await expect(page.getByPlaceholder(/seu@email.com/i)).toBeVisible();
    await expect(page.getByPlaceholder(/••••••••/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /entrar/i })).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill in invalid credentials
    await page.getByPlaceholder(/seu@email.com/i).fill('invalid@email.com');
    await page.getByPlaceholder(/••••••••/i).fill('wrongpassword');
    await page.getByRole('button', { name: /entrar|login|acessar/i }).click();

    // Should show error message
    await expect(page.getByText(/inválid|error|incorrect/i)).toBeVisible({ timeout: 10000 });
  });

  test('should redirect to dashboard on successful login', async ({ page }) => {
    // Note: This test requires valid test credentials
    // You should set up test user in your Supabase project
    await page.goto('/login');

    // Fill in valid credentials (update with your test user)
    await page
      .getByPlaceholder(/seu@email.com/i)
      .fill(process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.getByPlaceholder(/••••••••/i).fill(process.env.TEST_USER_PASSWORD || 'testpassword');
    await page.getByRole('button', { name: /entrar|login|acessar/i }).click();

    // Should redirect to dashboard or home page
    await expect(page).toHaveURL(/\/(dashboard|home|$)/, { timeout: 15000 });
  });
  test('should recover from invalid credentials and login successfully', async ({ page }) => {
    // Mock app_user query
    await page.route('**/rest/v1/app_user*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'fake-app-user-id',
          auth_user_id: 'fake-user-id',
          company_id: 'fake-company-id',
          name: 'Test User',
          email: 'test@example.com',
          active: true,
          access_profile: { id: 'fake-profile-id', code: 'admin', name: 'Admin', is_admin: true },
        }),
      });
    });

    // Mock company query
    await page.route('**/rest/v1/company*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'fake-company-id',
          name: 'Test Company',
          active: true,
        }),
      });
    });

    // Mock login failure and success
    await page.route('**/auth/v1/token*', async (route) => {
      const postData = route.request().postDataJSON();
      console.log('Intercepted login request:', postData);
      if (postData.password === 'wrongpassword') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'invalid_grant',
            error_description: 'Invalid login credentials',
          }),
        });
      } else {
        // Mock success
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'fake-jwt-token',
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: 'fake-refresh-token',
            user: {
              id: 'fake-user-id',
              aud: 'authenticated',
              role: 'authenticated',
              email: 'test@example.com',
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
      }
    });

    await page.goto('/login');

    // 1. Attempt invalid login
    await page.getByPlaceholder(/seu@email.com/i).fill('invalid@email.com');
    await page.getByPlaceholder(/••••••••/i).fill('wrongpassword');
    await page.getByRole('button', { name: /entrar/i }).click();

    // Verify error message
    await expect(page.getByText(/inválid|error|incorrect/i)).toBeVisible({ timeout: 10000 });

    // 2. Correct credentials
    await page.getByPlaceholder(/seu@email.com/i).fill('test@example.com');
    await page.getByPlaceholder(/••••••••/i).fill('correctpassword');
    await page.getByRole('button', { name: /entrar/i }).click();

    // Verify successful redirect
    await expect(page).toHaveURL(/\/(dashboard|home|$)/, { timeout: 15000 });
  });
});
