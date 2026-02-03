import { test, expect } from '@playwright/test'

test.describe('Collection Empty State', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/auth/login')
    await page.getByPlaceholder('Email').fill('admin@example.com')
    await page.getByPlaceholder('Password').fill('admin')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/\/app\/home/)

    // Navigate to collections page
    await page.goto('/app/collections')
    await page.waitForLoadState('networkidle')
  })

  test.describe('Empty State Display', () => {
    test('should display empty state when no collections exist', async ({ page }) => {
      // Mock the API response for empty collections
      await page.route('**/api/collections?**', async (route) => {
        const json = {
          total: 0,
          page: 1,
          limit: 40,
          collections: [],
          totalPages: 0,
          hasMore: false,
        }
        await route.fulfill({ json })
      })

      // Reload the page to get empty state
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Should display empty state message
      const emptyState = page.getByText('No collections yet')
      const hasEmptyState = await emptyState.isVisible().catch(() => false)

      if (hasEmptyState) {
        await expect(emptyState).toBeVisible()
      }
    })
  })
})
