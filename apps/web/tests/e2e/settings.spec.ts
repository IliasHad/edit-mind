import { test, expect } from '@playwright/test'

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/settings')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('h1:has-text("Settings")')
  })

  test('should display Video Folders section', async ({ page }) => {
    await expect(page.getByText('Video Folders').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add Folder' })).toBeVisible()
  })
})
