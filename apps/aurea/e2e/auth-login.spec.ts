import { test, expect } from '@playwright/test'

const email = process.env.E2E_USER_EMAIL || 'e2e.admin@aurea.local'
const password = process.env.E2E_USER_PASSWORD || 'AureaE2E!123'

test('login com usuario de teste e acesso ao dashboard', async ({ page }) => {
  await page.goto('/login')

  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  await page.getByRole('button', { name: /entrar/i }).click()

  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByText(/Atividades/i)).toBeVisible()
})
