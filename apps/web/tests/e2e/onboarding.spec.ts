import { test, expect } from '@playwright/test'

test.describe('Onboarding Page', () => {
  test('should navigate through onboarding and land on login', async ({ page }) => {
    await page.goto('/onboarding')
    await page.waitForLoadState('networkidle')

    // Step 1
    await expect(page.getByText(/Your video library,.*reimagined/i)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForLoadState('networkidle')

    // Step 2: wait for step content to appear
    const step2Text = page.getByText(/Search with\s*natural language/i)
    await step2Text.waitFor({ state: 'visible', timeout: 1000 * 10 })
    await expect(step2Text).toBeVisible()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForLoadState('networkidle')

    // Step 3
    const step3Text = page.getByText(/AI-generated rough cuts/i)
    await step3Text.waitFor({ state: 'visible', timeout: 1000 * 10 })
    await expect(step3Text).toBeVisible()
    await page.getByRole('button', { name: 'Get Started' }).click()
    await page.waitForLoadState('networkidle')

    // Should land on login page after onboarding
    await expect(page).toHaveURL(/.*auth\/login/)
    await expect(page.getByText('Welcome back')).toBeVisible()
  })

  test('should skip onboarding and land on login', async ({ page }) => {
    await page.goto('/onboarding')
    await page.getByRole('button', { name: 'Skip' }).click()

    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/.*auth\/login/)
    await expect(page.getByText('Welcome back')).toBeVisible()
  })

  test('should redirect to login if onboarding is already completed', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('onboarding_complete', 'true')
    })

    await page.goto('/onboarding')

    await expect(page).toHaveURL(/.*auth\/login/)
    await expect(page.getByText('Welcome back')).toBeVisible()
  })
})
