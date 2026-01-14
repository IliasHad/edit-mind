import { test, expect } from '@playwright/test'

test.describe('Search Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/search')
    await page.waitForLoadState('networkidle')
  })

  test('should display empty state message initially', async ({ page }) => {
    await expect(page.getByText('Find scenes by text, image, faces, objects, and emotions')).toBeVisible()
    await expect(page.getByText('Start typing to search your video scenes')).toBeVisible()
  })
})
