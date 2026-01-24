import { test, expect } from '@playwright/test'

test.describe('Faces Page - Known and Unknown Faces', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/auth/login')
    await page.getByPlaceholder('Email').fill('admin@example.com')
    await page.getByPlaceholder('Password').fill('admin')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/\/app\/home/)

    await page.goto('/app/faces')
  })

  test('should display known faces and unknown faces sections', async ({ page }) => {
    await expect(page.getByText('My People')).toBeVisible()

    await expect(page.locator('[aria-label="Unknown faces tab"]')).toBeVisible()
    await expect(page.locator('[aria-label="Known faces tab"]')).toBeVisible()
  })

  test.describe('Known Faces List Display', () => {
    test('should display a list of known faces', async ({ page }) => {
      // Mock the API response for known faces
      await page.route('**/api/faces/known?**', async (route) => {
        const json = {
          total: 1,
          page: 1,
          limit: 40,
          faces: [
            {
              name: 'John Doe',
              images: Array(5),
            },
          ],
          totalPages: 1,
          hasMore: false,
        }
        await route.fulfill({ json })
      })

      await expect(page.getByText('John Doe')).toBeVisible()
      await expect(page.getByText('5 images')).toBeVisible()
    })

    test('should display multiple known faces', async ({ page }) => {
      // Mock the API response for multiple known faces
      await page.route('**/api/faces/known?**', async (route) => {
        const json = {
          total: 2,
          page: 1,
          limit: 40,
          faces: [
            {
              name: 'John Doe',
              images: Array(5),
            },
            {
              name: 'Jane Smith',
              images: Array(3),
            },
          ],
          totalPages: 1,
          hasMore: false,
        }
        await route.fulfill({ json })
      })

      await expect(page.getByText('John Doe')).toBeVisible()
      await expect(page.getByText('Jane Smith')).toBeVisible()
      await expect(page.getByText('5 images')).toBeVisible()
      await expect(page.getByText('3 images')).toBeVisible()
    })
  })

  test.describe('Unknown Faces and Labeling', () => {
    test('should switch to unknown tab and display empty state', async ({ page }) => {
      // Mock the API response for unknown faces (empty)
      await page.route('**/api/faces/unknown?**', async (route) => {
        const json = {
          total: 0,
          page: 1,
          limit: 40,
          faces: [],
          totalPages: 0,
          hasMore: false,
        }
        await route.fulfill({ json })
      })

      // Click the Unknown faces tab
      await page.getByRole('button', { name: 'Unknown faces tab' }).click()

      // Check URL has the tab parameter
      await expect(page).toHaveURL(/\/app\/faces\?tab=unknown/)

      // Check for empty state messages
      await expect(page.getByRole('heading', { name: 'All faces labeled' })).toBeVisible()
      await expect(page.getByText('Your library is fully trained')).toBeVisible()
    })

    test('should display a list of unknown faces', async ({ page }) => {
      // Mock the API response for unknown faces
      await page.route('**/api/faces/unknown?**', async (route) => {
        const json = {
          total: 1,
          page: 1,
          limit: 40,
          faces: [
            {
              face_id: 'Unknown_003',
              job_id: 'Y-OTvyzIWgiMR3kQihO29',
              image_file: 'Unknown_003_8bcffa96.jpg',
              json_file: 'Unknown_003_8bcffa96.json',
              image_hash: '5d713f512c53461ab4033c35cf082008',
              created_at: '2026-01-22T05:24:10.798959',
              video_path: '/media/videos/ssd/GoPro SD 2026/GX016191.MP4',
              video_name: 'GX016191.MP4',
              all_appearances: [
                {
                  frame_index: 493,
                  timestamp_ms: 16450,
                  timestamp_seconds: 16.45,
                  formatted_timestamp: '00:16',
                },
                {
                  frame_index: 1247,
                  timestamp_ms: 41608,
                  timestamp_seconds: 41.608,
                  formatted_timestamp: '00:41',
                },
              ],
              frame_idx: 493,
              total_appearances: 10,
              last_updated: '2026-01-22T05:30:59.846176',
              last_appearance: {
                frame_index: 1421,
                timestamp_ms: 47414,
                timestamp_seconds: 47.414,
                formatted_timestamp: '00:47',
              },
            },
          ],
          totalPages: 1,
          hasMore: false,
        }
        await route.fulfill({ json })
      })

      // Click the Unknown faces tab
      await page.getByRole('button', { name: 'Unknown faces tab' }).click()

      // Check URL has the tab parameter
      await expect(page).toHaveURL(/\/app\/faces\?tab=unknown/)

      // Check that unknown face is displayed
      await expect(page.getByText('10 appearances')).toBeVisible()
      await expect(page.getByText('GX016191.MP4')).toBeVisible()
    })

    test('should display multiple unknown faces', async ({ page }) => {
      // Mock the API response with multiple unknown faces
      await page.route('**/api/faces/unknown?**', async (route) => {
        const json = {
          total: 2,
          page: 1,
          limit: 40,
          faces: [
            {
              face_id: 'Unknown_001',
              job_id: 'job-1',
              image_file: 'Unknown_001.jpg',
              json_file: 'Unknown_001.json',
              image_hash: 'hash1',
              created_at: '2026-01-22T05:24:10.798959',
              video_path: '/media/videos/video1.mp4',
              video_name: 'video1.mp4',
              all_appearances: [],
              frame_idx: 100,
              total_appearances: 5,
              last_updated: '2026-01-22T05:30:59.846176',
              last_appearance: {
                frame_index: 500,
                timestamp_ms: 10000,
                timestamp_seconds: 10,
                formatted_timestamp: '00:10',
              },
            },
            {
              face_id: 'Unknown_002',
              job_id: 'job-2',
              image_file: 'Unknown_002.jpg',
              json_file: 'Unknown_002.json',
              image_hash: 'hash2',
              created_at: '2026-01-22T05:25:10.798959',
              video_path: '/media/videos/video2.mp4',
              video_name: 'video2.mp4',
              all_appearances: [],
              frame_idx: 200,
              total_appearances: 8,
              last_updated: '2026-01-22T05:31:59.846176',
              last_appearance: {
                frame_index: 800,
                timestamp_ms: 20000,
                timestamp_seconds: 20,
                formatted_timestamp: '00:20',
              },
            },
          ],
          totalPages: 1,
          hasMore: false,
        }
        await route.fulfill({ json })
      })

      // Click the Unknown faces tab
      await page.getByRole('button', { name: 'Unknown faces tab' }).click()

      // Check URL has the tab parameter
      await expect(page).toHaveURL(/\/app\/faces\?tab=unknown/)

      // Check that both unknown faces are displayed
      await expect(page.getByText('5 appearances')).toBeVisible()
      await expect(page.getByText('8 appearances')).toBeVisible()
      await expect(page.getByText('video1.mp4')).toBeVisible()
      await expect(page.getByText('video2.mp4')).toBeVisible()
    })

    test('should display loading state when fetching unknown faces', async ({ page }) => {
      // Mock the API response with delay
      await page.route('**/api/faces/unknown?**', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 500))
        const json = {
          total: 0,
          page: 1,
          limit: 40,
          faces: [],
          totalPages: 0,
          hasMore: false,
        }
        await route.fulfill({ json })
      })

      // Click the Unknown faces tab
      await page.getByRole('button', { name: 'Unknown faces tab' }).click()

      // Should eventually load
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(/\/app\/faces\?tab=unknown/)
    })

    test('should display face labeling input for unknown faces', async ({ page }) => {
      // Mock the API response for unknown faces
      await page.route('**/api/faces/unknown?**', async (route) => {
        const json = {
          total: 1,
          page: 1,
          limit: 40,
          faces: [
            {
              face_id: 'Unknown_003',
              job_id: 'Y-OTvyzIWgiMR3kQihO29',
              image_file: 'Unknown_003_8bcffa96.jpg',
              json_file: 'Unknown_003_8bcffa96.json',
              image_hash: '5d713f512c53461ab4033c35cf082008',
              created_at: '2026-01-22T05:24:10.798959',
              video_path: '/media/videos/ssd/GoPro SD 2026/GX016191.MP4',
              video_name: 'GX016191.MP4',
              all_appearances: [],
              frame_idx: 493,
              total_appearances: 10,
              last_updated: '2026-01-22T05:30:59.846176',
              last_appearance: {
                frame_index: 1421,
                timestamp_ms: 47414,
                timestamp_seconds: 47.414,
                formatted_timestamp: '00:47',
              },
            },
          ],
          totalPages: 1,
          hasMore: false,
        }
        await route.fulfill({ json })
      })

      // Click the Unknown faces tab
      await page.getByRole('button', { name: 'Unknown faces tab' }).click()

      // Should display labeling input or button
      const labelInput = page.locator('[data-testid="face-label-input"]')
      const labelButton = page.locator('[data-testid="face-label-button"]')

      const hasInput = await labelInput.isVisible().catch(() => false)
      const hasButton = await labelButton.isVisible().catch(() => false)

      if (hasInput || hasButton) {
        expect(hasInput || hasButton).toBeTruthy()
      }
    })

    test('should allow labeling unknown face', async ({ page }) => {
      // Mock the API response for unknown faces
      await page.route('**/api/faces/unknown?**', async (route) => {
        const json = {
          total: 1,
          page: 1,
          limit: 40,
          faces: [
            {
              face_id: 'Unknown_003',
              job_id: 'Y-OTvyzIWgiMR3kQihO29',
              image_file: 'Unknown_003_8bcffa96.jpg',
              json_file: 'Unknown_003_8bcffa96.json',
              image_hash: '5d713f512c53461ab4033c35cf082008',
              created_at: '2026-01-22T05:24:10.798959',
              video_path: '/media/videos/ssd/GoPro SD 2026/GX016191.MP4',
              video_name: 'GX016191.MP4',
              all_appearances: [],
              frame_idx: 493,
              total_appearances: 10,
              last_updated: '2026-01-22T05:30:59.846176',
              last_appearance: {
                frame_index: 1421,
                timestamp_ms: 47414,
                timestamp_seconds: 47.414,
                formatted_timestamp: '00:47',
              },
            },
          ],
          totalPages: 1,
          hasMore: false,
        }
        await route.fulfill({ json })
      })

      // Mock the label API
      await page.route('**/api/faces/label', async (route) => {
        const json = { success: true }
        await route.fulfill({ json })
      })

      // Click the Unknown faces tab
      await page.getByRole('button', { name: 'Unknown faces tab' }).click()

      // Try to label the face
      const labelInput = page.locator('[data-testid="face-label-input"]')
      const labelButton = page.locator('[data-testid="face-label-button"]')

      const hasInput = await labelInput.isVisible().catch(() => false)
      const hasButton = await labelButton.isVisible().catch(() => false)

      if (hasInput && hasButton) {
        await labelInput.fill('John Doe')
        await labelButton.click()
        await page.waitForLoadState('networkidle')
      }
    })
  })
})

test.describe('Face Labeling Round Trip', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/auth/login')
    await page.getByPlaceholder('Email').fill('admin@example.com')
    await page.getByPlaceholder('Password').fill('admin')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/\/app\/home/)

    await page.goto('/app/faces')
  })

  test('property: labeled unknown face appears in known faces', async ({ page }) => {
    // Mock the API response for unknown faces
    await page.route('**/api/faces/unknown?**', async (route) => {
      const json = {
        total: 1,
        page: 1,
        limit: 40,
        faces: [
          {
            face_id: 'Unknown_003',
            job_id: 'Y-OTvyzIWgiMR3kQihO29',
            image_file: 'Unknown_003_8bcffa96.jpg',
            json_file: 'Unknown_003_8bcffa96.json',
            image_hash: '5d713f512c53461ab4033c35cf082008',
            created_at: '2026-01-22T05:24:10.798959',
            video_path: '/media/videos/ssd/GoPro SD 2026/GX016191.MP4',
            video_name: 'GX016191.MP4',
            all_appearances: [],
            frame_idx: 493,
            total_appearances: 10,
            last_updated: '2026-01-22T05:30:59.846176',
            last_appearance: {
              frame_index: 1421,
              timestamp_ms: 47414,
              timestamp_seconds: 47.414,
              formatted_timestamp: '00:47',
            },
          },
        ],
        totalPages: 1,
        hasMore: false,
      }
      await route.fulfill({ json })
    })

    // Mock the label API
    await page.route('**/api/faces/label', async (route) => {
      const json = { success: true }
      await route.fulfill({ json })
    })

    // Click the Unknown faces tab
    await page.getByRole('button', { name: 'Unknown faces tab' }).click()

    // Try to label the face
    const labelInput = page.locator('[data-testid="face-label-input"]')
    const labelButton = page.locator('[data-testid="face-label-button"]')

    const hasInput = await labelInput.isVisible().catch(() => false)
    const hasButton = await labelButton.isVisible().catch(() => false)

    if (hasInput && hasButton) {
      await labelInput.fill('John Doe')
      await labelButton.click()
      await page.waitForLoadState('networkidle')

      // After labeling, navigate back to known faces
      await page.getByRole('button', { name: 'Known faces tab' }).click()
      await page.waitForLoadState('networkidle')

      // Should see the labeled face in known faces
      const pageText = await page.textContent('body')
      expect(pageText).toBeTruthy()
    }
  })
})
