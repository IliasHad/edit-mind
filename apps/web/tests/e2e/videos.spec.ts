import { test, expect } from '@playwright/test'

test.describe('Video Detail Page', () => {
  test('should display video not found page', async ({ page }) => {
    const videoSource = encodeURIComponent('/media/videos/invalid')
    await page.goto(`/app/videos?source=${videoSource}`)

    await expect(page.getByText('Video Not Found')).toBeVisible()
  })
})
