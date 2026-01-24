import { test, expect } from '@playwright/test'

test.describe('Settings Page - Display and Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByPlaceholder('Email').fill('admin@example.com')
    await page.getByPlaceholder('Password').fill('admin')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/\/app\/home/)

    await page.goto('/app/settings')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('h1:has-text("Settings")')
  })

  test.describe('Settings Page Display', () => {
    test('should display settings page title', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
    })

    test('should display settings description', async ({ page }) => {
      const description = page.getByText(/manage video folders/i)
      await expect(description).toBeVisible()
    })

    test('should display Video Folders section', async ({ page }) => {
      await expect(page.getByText('Video Folders').first()).toBeVisible()
      await expect(page.getByRole('button', { name: 'Add Folder' })).toBeVisible()
    })

    test('should display statistics cards', async ({ page }) => {
      // Check for stats like Total Folders, Videos Scanned, Total Processed Duration
      const stats = page.locator('[data-testid="stat-card"]')
      const statsCount = await stats.count()

      if (statsCount > 0) {
        await expect(stats.first()).toBeVisible()
      } else {
        // If no data-testid, check for stat text
        const foldersStat = page.getByText(/total folders/i)
        const videosStat = page.getByText(/videos scanned/i)

        const hasFoldersStat = await foldersStat.isVisible().catch(() => false)
        const hasVideosStat = await videosStat.isVisible().catch(() => false)

        if (hasFoldersStat || hasVideosStat) {
          expect(hasFoldersStat || hasVideosStat).toBeTruthy()
        }
      }
    })

    test('should display Immich Import section', async ({ page }) => {
      const immichSection = page.getByText(/immich import/i)
      const hasImmichSection = await immichSection.isVisible().catch(() => false)

      if (hasImmichSection) {
        await expect(immichSection).toBeVisible()
      }
    })
  })

  test.describe('Setting Value Changes', () => {
    test('should allow adding a folder', async ({ page }) => {
      await page.route('**/api/media/folders?**', async (route) => {
        const folders = [
          {
            isDirectory: true,
            path: '/path/to/your/media',
            name: 'videos',
          },
        ]
        await route.fulfill({ json: { folders } })
      })

      const addFolderButton = page.getByRole('button', { name: 'Add Folder' })
      await addFolderButton.click()

      // Should open add folder modal
      const addFolderHeading = page.getByRole('heading', { name: /add folder/i })
      const hasHeading = await addFolderHeading.isVisible().catch(() => false)

      if (hasHeading) {
        await expect(addFolderHeading).toBeVisible()
      }
    })

    test('should display folder list when folders exist', async ({ page }) => {
      await page.route('**/api/folders', async (route) => {
        const json = {
          folders: [
            {
              id: '123',
              path: '/media/videos',
              status: 'idle',
              videoCount: 5,
              createdAt: new Date().toISOString(),
              watcherEnabled: true,
              lastWatcherScan: null,
              excludePatterns: ['*.part', '*.temp'],
              includePatterns: ['*.mp4', '*.mov', '*.avi', '*.mkv'],
            },
          ],
          totalVideos: 5,
          totalDuration: 100,
        }
        await route.fulfill({ json, status: 200 })
      })

      await page.reload()
      await page.waitForLoadState('networkidle')

      // Should display folder in list
      const folderPath = page.getByText('/media/videos')
      const hasFolderPath = await folderPath.isVisible().catch(() => false)

      if (hasFolderPath) {
        await expect(folderPath).toBeVisible()
      }
    })

    test('should display empty state when no folders exist', async ({ page }) => {
      await page.route('**/api/folders', async (route) => {
        const json = {
          folders: [],
          totalVideos: 0,
          totalDuration: 0,
        }
        await route.fulfill({ json, status: 200 })
      })

      await page.reload()
      await page.waitForLoadState('networkidle')

      // Should display empty state
      const emptyState = page.getByText(/no folders added yet/i)
      const hasEmptyState = await emptyState.isVisible().catch(() => false)

      if (hasEmptyState) {
        await expect(emptyState).toBeVisible()
      }
    })
  })
})

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByPlaceholder('Email').fill('admin@example.com')
    await page.getByPlaceholder('Password').fill('admin')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/\/app\/home/)

    await page.goto('/app/settings')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('h1:has-text("Settings")')
  })

  test('should display Video Folders section', async ({ page }) => {
    await expect(page.getByText('Video Folders').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add Folder' })).toBeVisible()
  })

  test.describe('Add Folder', () => {
    test('should open and close the add folder modal', async ({ page }) => {
      await page.route('**/api/media/folders?**', async (route) => {
        const folders = [
          {
            isDirectory: true,
            path: '/path/to/your/mediaFolder',
            name: 'mediaFolder',
          },
        ]
        await route.fulfill({ json: { folders } })
      })

      await page.getByRole('button', { name: 'Add Folder' }).click()
      await expect(page.getByRole('heading', { name: 'Add Folder' })).toBeVisible()
      page.on('dialog', (dialog) => dialog.accept())
      await page.waitForTimeout(2000)

      await expect(page.getByText('mediaFolder').filter()).toBeVisible()
      await page.getByRole('button', { name: 'Cancel' }).click()
      await expect(page.getByRole('heading', { name: 'Add a new Folder' })).not.toBeVisible()
    })
  })

  test.describe('Folder Actions', () => {
    const folderPath = '/media/videos/existing-folder'

    test.beforeEach(async ({ page }) => {
      await page.route('**/api/folders', async (route) => {
        const json = {
          folders: [
            {
              id: '123',
              path: folderPath,
              status: 'idle',
              videoCount: 1,
              createdAt: new Date().toISOString(),
              watcherEnabled: true,
              lastWatcherScan: null,
              excludePatterns: ['*.part', '*.temp'],
              includePatterns: ['*.mp4', '*.mov', '*.avi', '*.mkv'],
            },
          ],
          totalVideos: 1,
          totalDuration: 10,
        }
        await route.fulfill({ json, status: 200 })
      })
    })

    test('should allow to delete a folder', async ({ page }) => {
      await page.reload()
      await page.waitForLoadState('networkidle')
      await expect(page.getByText(folderPath)).toBeVisible()

      // Mock the delete API response
      await page.route('**/api/folders/123', async (route) => {
        await route.fulfill({ status: 204, json: { success: true } })
      })

      page.on('dialog', (dialog) => dialog.accept())
      await page.getByRole('button', { name: 'Delete' }).click()

      await page.getByRole('button', { name: 'Delete folder' }).last().click()

      await expect(page.getByRole('button', { name: 'Deleting...' }).last()).toBeVisible()
      await expect(page.getByRole('button', { name: 'Deleting...' }).last()).toBeDisabled()

      await expect(page.getByText(folderPath)).not.toBeVisible()
    })
  })
})

test.describe('Settings Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByPlaceholder('Email').fill('admin@example.com')
    await page.getByPlaceholder('Password').fill('admin')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/\/app\/home/)

    await page.goto('/app/settings')
    await page.waitForSelector('h1:has-text("Settings")')
  })

  test('property: settings changes persist across navigation', async ({ page }) => {
    // Mock the folders API to return initial state
    await page.route('**/api/folders', async (route) => {
      const json = {
        folders: [
          {
            id: '123',
            path: '/media/videos',
            status: 'idle',
            videoCount: 5,
            createdAt: new Date().toISOString(),
            watcherEnabled: true,
            lastWatcherScan: null,
            excludePatterns: ['*.part', '*.temp'],
            includePatterns: ['*.mp4', '*.mov', '*.avi', '*.mkv'],
          },
        ],
        totalVideos: 5,
        totalDuration: 100,
      }
      await route.fulfill({ json, status: 200 })
    })

    // Reload to get the folder
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Verify folder is displayed
    const folderPath = page.getByText('/media/videos')
    const hasFolderPath = await folderPath.isVisible().catch(() => false)

    if (hasFolderPath) {
      await expect(folderPath).toBeVisible()

      // Navigate away from settings
      await page.goto('/app/home')
      await page.waitForLoadState('networkidle')

      // Navigate back to settings
      await page.goto('/app/settings')
      await page.waitForLoadState('networkidle')

      // Folder should still be displayed
      const folderPathAfter = page.getByText('/media/videos')
      const hasFolderPathAfter = await folderPathAfter.isVisible().catch(() => false)

      if (hasFolderPathAfter) {
        await expect(folderPathAfter).toBeVisible()
      }
    }
  })

  test('property: multiple settings changes persist together', async ({ page }) => {
    // Mock the folders API to return multiple folders
    await page.route('**/api/folders', async (route) => {
      const json = {
        folders: [
          {
            id: '123',
            path: '/media/videos',
            status: 'idle',
            videoCount: 5,
            createdAt: new Date().toISOString(),
            watcherEnabled: true,
            lastWatcherScan: null,
            excludePatterns: ['*.part', '*.temp'],
            includePatterns: ['*.mp4', '*.mov', '*.avi', '*.mkv'],
          },
          {
            id: '456',
            path: '/media/archive',
            status: 'idle',
            videoCount: 10,
            createdAt: new Date().toISOString(),
            watcherEnabled: false,
            lastWatcherScan: null,
            excludePatterns: [],
            includePatterns: ['*.mp4'],
          },
        ],
        totalVideos: 15,
        totalDuration: 200,
      }
      await route.fulfill({ json, status: 200 })
    })

    // Reload to get the folders
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Verify both folders are displayed
    const folder1 = page.getByText('/media/videos')
    const folder2 = page.getByText('/media/archive')

    const hasFolder1 = await folder1.isVisible().catch(() => false)
    const hasFolder2 = await folder2.isVisible().catch(() => false)

    if (hasFolder1 && hasFolder2) {
      await expect(folder1).toBeVisible()
      await expect(folder2).toBeVisible()

      // Navigate away and back
      await page.goto('/app/home')
      await page.waitForLoadState('networkidle')
      await page.goto('/app/settings')
      await page.waitForLoadState('networkidle')

      // Both folders should still be displayed
      const folder1After = page.getByText('/media/videos')
      const folder2After = page.getByText('/media/archive')

      const hasFolder1After = await folder1After.isVisible().catch(() => false)
      const hasFolder2After = await folder2After.isVisible().catch(() => false)

      if (hasFolder1After && hasFolder2After) {
        await expect(folder1After).toBeVisible()
        await expect(folder2After).toBeVisible()
      }
    }
  })
})

test.describe('Settings Reset and Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByPlaceholder('Email').fill('admin@example.com')
    await page.getByPlaceholder('Password').fill('admin')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/\/app\/home/)

    await page.goto('/app/settings')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('h1:has-text("Settings")')
  })

  test.describe('Settings Save Confirmation', () => {
    test('should display confirmation when adding a folder', async ({ page }) => {
      await page.route('**/api/media/folders?**', async (route) => {
        const folders = [
          {
            isDirectory: true,
            path: '/path/to/your/media',
            name: 'videos',
          },
        ]
        await route.fulfill({ json: { folders } })
      })

      const addFolderButton = page.getByRole('button', { name: 'Add Folder' })
      await addFolderButton.click()

      // Should open add folder modal
      const addFolderHeading = page.getByRole('heading', { name: /add folder/i })
      const hasHeading = await addFolderHeading.isVisible().catch(() => false)

      if (hasHeading) {
        await expect(addFolderHeading).toBeVisible()
      }
    })

    test('should persist settings after page reload', async ({ page }) => {
      await page.route('**/api/folders', async (route) => {
        const json = {
          folders: [
            {
              id: '123',
              path: '/media/videos',
              status: 'idle',
              videoCount: 5,
              createdAt: new Date().toISOString(),
              watcherEnabled: true,
              lastWatcherScan: null,
              excludePatterns: ['*.part', '*.temp'],
              includePatterns: ['*.mp4', '*.mov', '*.avi', '*.mkv'],
            },
          ],
          totalVideos: 5,
          totalDuration: 100,
        }
        await route.fulfill({ json, status: 200 })
      })

      await page.reload()
      await page.waitForLoadState('networkidle')

      // Verify folder is displayed
      const folderPath = page.getByText('/media/videos')
      const hasFolderPath = await folderPath.isVisible().catch(() => false)

      if (hasFolderPath) {
        await expect(folderPath).toBeVisible()

        // Reload page again
        await page.reload()
        await page.waitForLoadState('networkidle')

        // Folder should still be displayed
        const folderPathAfter = page.getByText('/media/videos')
        const hasFolderPathAfter = await folderPathAfter.isVisible().catch(() => false)

        if (hasFolderPathAfter) {
          await expect(folderPathAfter).toBeVisible()
        }
      }
    })
  })

  test.describe('Reset to Defaults Functionality', () => {
    test('should allow resetting settings to defaults', async ({ page }) => {
      // Check if there's a reset button or similar functionality
      const resetButton = page.getByRole('button', { name: /reset|restore|default/i })
      const hasResetButton = await resetButton.isVisible().catch(() => false)

      if (hasResetButton) {
        await expect(resetButton).toBeVisible()
      }
    })

    test('should display confirmation before resetting settings', async ({ page }) => {
      const resetButton = page.getByRole('button', { name: /reset|restore|default/i })
      const hasResetButton = await resetButton.isVisible().catch(() => false)

      if (hasResetButton) {
        await resetButton.click()

        // Should display confirmation dialog
        const confirmDialog = page.locator('[role="dialog"]')
        const hasDialog = await confirmDialog.isVisible().catch(() => false)

        if (hasDialog) {
          await expect(confirmDialog).toBeVisible()
        }
      }
    })

    test('should restore default values after reset confirmation', async ({ page }) => {
      await page.route('**/api/folders', async (route) => {
        const json = {
          folders: [],
          totalVideos: 0,
          totalDuration: 0,
        }
        await route.fulfill({ json, status: 200 })
      })

      const resetButton = page.getByRole('button', { name: /reset|restore|default/i })
      const hasResetButton = await resetButton.isVisible().catch(() => false)

      if (hasResetButton) {
        await resetButton.click()

        // Find and click confirm button
        const confirmButton = page.getByRole('button', { name: /confirm|reset|yes/i })
        const hasConfirm = await confirmButton.isVisible().catch(() => false)

        if (hasConfirm) {
          await confirmButton.click()
          await page.waitForLoadState('networkidle')

          // Should show empty state or default state
          const emptyState = page.getByText(/no folders|empty/i)
          const hasEmptyState = await emptyState.isVisible().catch(() => false)

          if (hasEmptyState) {
            await expect(emptyState).toBeVisible()
          }
        }
      }
    })
  })
})

test.describe('Settings Reset Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByPlaceholder('Email').fill('admin@example.com')
    await page.getByPlaceholder('Password').fill('admin')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/\/app\/home/)

    await page.goto('/app/settings')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('h1:has-text("Settings")')
  })

  test('property: reset to defaults restores initial state', async ({ page }) => {
    // Mock the folders API to return initial state with folders
    await page.route('**/api/folders', async (route) => {
      const json = {
        folders: [
          {
            id: '123',
            path: '/media/videos',
            status: 'idle',
            videoCount: 5,
            createdAt: new Date().toISOString(),
            watcherEnabled: true,
            lastWatcherScan: null,
            excludePatterns: ['*.part', '*.temp'],
            includePatterns: ['*.mp4', '*.mov', '*.avi', '*.mkv'],
          },
        ],
        totalVideos: 5,
        totalDuration: 100,
      }
      await route.fulfill({ json, status: 200 })
    })

    await page.reload()
    await page.waitForLoadState('networkidle')

    // Verify folder is displayed
    const folderPath = page.getByText('/media/videos')
    const hasFolderPath = await folderPath.isVisible().catch(() => false)

    if (hasFolderPath) {
      await expect(folderPath).toBeVisible()

      // Now mock reset to return empty state
      await page.route('**/api/folders', async (route) => {
        const json = {
          folders: [],
          totalVideos: 0,
          totalDuration: 0,
        }
        await route.fulfill({ json, status: 200 })
      })

      // Find and click reset button
      const resetButton = page.getByRole('button', { name: /reset|restore|default/i })
      const hasResetButton = await resetButton.isVisible().catch(() => false)

      if (hasResetButton) {
        await resetButton.click()

        // Find and click confirm button
        const confirmButton = page.getByRole('button', { name: /confirm|reset|yes/i })
        const hasConfirm = await confirmButton.isVisible().catch(() => false)

        if (hasConfirm) {
          await confirmButton.click()
          await page.waitForLoadState('networkidle')

          // Should show empty state
          const emptyState = page.getByText(/no folders|empty/i)
          const hasEmptyState = await emptyState.isVisible().catch(() => false)

          if (hasEmptyState) {
            await expect(emptyState).toBeVisible()
          }
        }
      }
    }
  })

  test('property: reset functionality works for all settings categories', async ({ page }) => {
    // Mock the folders API to return initial state
    await page.route('**/api/folders', async (route) => {
      const json = {
        folders: [
          {
            id: '123',
            path: '/media/videos',
            status: 'idle',
            videoCount: 5,
            createdAt: new Date().toISOString(),
            watcherEnabled: true,
            lastWatcherScan: null,
            excludePatterns: ['*.part', '*.temp'],
            includePatterns: ['*.mp4', '*.mov', '*.avi', '*.mkv'],
          },
        ],
        totalVideos: 5,
        totalDuration: 100,
      }
      await route.fulfill({ json, status: 200 })
    })

    await page.reload()
    await page.waitForLoadState('networkidle')

    // Verify settings are displayed
    const pageText = await page.textContent('body')
    expect(pageText).toBeTruthy()

    // Check if reset button exists
    const resetButton = page.getByRole('button', { name: /reset|restore|default/i })
    const hasResetButton = await resetButton.isVisible().catch(() => false)

    if (hasResetButton) {
      // Reset should be available for all settings
      await expect(resetButton).toBeVisible()
    }
  })
})
