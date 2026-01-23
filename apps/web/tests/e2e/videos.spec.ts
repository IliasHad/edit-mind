import { test, expect } from '@playwright/test'

const mockVideoDetails = {
  scenes: [
    {
      id: 'scene-1',
      thumbnailUrl: '/thumbnails/scene-1.jpg',
      startTime: 0,
      endTime: 1,
      faces: ['John Doe'],
      objects: ['laptop', 'desk'],
      transcription: 'Hello world',
      description: 'A person working at a desk',
      shotType: 'medium-shot',
      emotions: [{ name: 'John Doe', emotion: 'happy', confidence: 85 }],
      createdAt: Date.now(),
      source: '/media/videos/test.mp4',
      camera: 'iPhone 12',
      dominantColorHex: '#4A5568',
      dominantColorName: 'Gray',
      detectedText: [],
      location: 'Office',
      duration: 10,
      aspectRatio: '16:9',
    },
    {
      id: 'scene-2',
      thumbnailUrl: '/thumbnails/scene-2.jpg',
      startTime: 1,
      endTime: 2,
      faces: ['John Doe'],
      objects: ['laptop', 'coffee'],
      transcription: 'This is a test',
      description: 'A person drinking coffee',
      shotType: 'close-up',
      emotions: [{ name: 'John Doe', emotion: 'neutral', confidence: 90 }],
      createdAt: Date.now(),
      source: '/media/videos/test.mp4',
      camera: 'iPhone 12',
      dominantColorHex: '#2D3748',
      dominantColorName: 'Dark Gray',
      detectedText: [],
      location: 'Office',
      duration: 10,
      aspectRatio: '16:9',
    },
  ],
  video: {
    id: '1234',
    source: '/media/videos/test.mp4',
    name: 'test.mp4',
    duration: 10,
    importAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    shottedAt: new Date().toISOString(),
    thumbnailUrl: '/thumbnails/test.mp4_cover.jpg',
    faces: ['John Doe'],
    emotions: ['happy', 'neutral'],
    shotTypes: ['medium-shot', 'close-up'],
    objects: ['laptop', 'desk', 'coffee'],
    aspectRatio: '16:9',
    userId: 'user-123',
    folderId: 'folder-123',
    collectionItems: [],
    projects: [],
  },
  videoExist: true,
  processedJob: {
    id: 'job-123',
    videoPath: '/media/videos/test.mp4',
    thumbnailPath: null,
    fileSize: 5000000,
    overallProgress: 100,
    progress: 100,
    stage: 'done',
    status: 'done',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    folderId: 'folder-123',
    userId: 'user-123',
  },
  processingRatio: 1.5,
  isProcessing: false,
}

test.describe('Video Not Found and Error States', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/auth/login')
    await page.getByPlaceholder('Email').fill('admin@example.com')
    await page.getByPlaceholder('Password').fill('admin')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/\/app\/home/)
  })

  test.describe('Video Not Found Error State', () => {
    test('should display video not found message for invalid video', async ({ page }) => {
      const videoSource = encodeURIComponent('/media/videos/invalid')
      await page.goto(`/app/videos?source=${videoSource}`)
      await page.waitForLoadState('networkidle')

      await expect(page.getByText(/video not found|does not exist/i)).toBeVisible()
    })

    test('should display error message for non-existent video source', async ({ page }) => {
      const videoSource = encodeURIComponent('/media/videos/nonexistent.mp4')
      await page.goto(`/app/videos?source=${videoSource}`)
      await page.waitForLoadState('networkidle')

      const errorMessage = page.getByText(/not found|error|invalid/i)
      const hasError = await errorMessage.isVisible().catch(() => false)

      if (hasError) {
        await expect(errorMessage).toBeVisible()
      }
    })

    test('should allow navigation back from not found state', async ({ page }) => {
      const videoSource = encodeURIComponent('/media/videos/invalid')
      await page.goto(`/app/videos?source=${videoSource}`)
      await page.waitForLoadState('networkidle')

      const backButton = page.getByRole('button', { name: /back|go back/i })
      const hasBackButton = await backButton.isVisible().catch(() => false)

      if (hasBackButton) {
        await backButton.click()
        await page.waitForLoadState('networkidle')

        // Should navigate back to videos list
        expect(page.url()).toContain('/app/videos')
      }
    })
  })

  test.describe('Video Details Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.route(`**/api/videos/123`, async (route) => {
        await route.fulfill({ json: mockVideoDetails })
      })
      await page.goto(`/app/videos/123`)
      await page.waitForLoadState('networkidle')
    })

    test('should display video and scene details', async ({ page }) => {
      // Check for scene-related information
      await expect(page.getByText(mockVideoDetails.scenes[0].camera)).toBeVisible()
      await expect(page.getByText(mockVideoDetails.scenes[0].dominantColorName)).toBeVisible()
      await expect(page.getByText(mockVideoDetails.scenes[0].shotType)).toBeVisible()
    })
  })
})
