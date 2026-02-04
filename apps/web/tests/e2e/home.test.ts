import { test, expect } from '@playwright/test'

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByPlaceholder('Email').fill('admin@example.com')
    await page.getByPlaceholder('Password').fill('admin')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.goto('/app/home')
    await page.waitForLoadState('networkidle')
  })

  test('should display dashboard title and description', async ({ page }) => {
    await expect(page.getByText(/My videos gallery's\s*second brain\./)).toBeVisible()
    await expect(page.getByText('Organize your video library locally and search with natural language.')).toBeVisible()
  })
})
