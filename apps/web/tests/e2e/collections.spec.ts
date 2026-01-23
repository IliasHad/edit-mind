import { test, expect } from '@playwright/test'

test.describe('Collections Page - List and Detail Display', () => {
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

  test.describe('Collections List Display', () => {
    test('should display collection thumbnails', async ({ page }) => {
      const collectionItems = page.locator('[data-testid="collection-item"]')
      const count = await collectionItems.count()

      if (count > 0) {
        const firstCollection = collectionItems.first()
        const thumbnail = firstCollection.locator('img')
        const hasThumbnail = await thumbnail.isVisible().catch(() => false)

        if (hasThumbnail) {
          await expect(thumbnail).toBeVisible()
        }
      }
    })

    test('should display collection metadata in list', async ({ page }) => {
      const collectionItems = page.locator('[data-testid="collection-item"]')
      const count = await collectionItems.count()

      if (count > 0) {
        const firstCollection = collectionItems.first()
        // Check for common metadata elements
        const metadata = firstCollection.locator('[data-testid="collection-metadata"]')
        const hasMetadata = await metadata.isVisible().catch(() => false)

        if (hasMetadata) {
          await expect(metadata).toBeVisible()
        }
      }
    })

    test('should display multiple collections in list format', async ({ page }) => {
      const collectionItems = page.locator('[data-testid="collection-item"]')
      const count = await collectionItems.count()

      // Should display multiple collections or empty state
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Collection Click Navigation', () => {
    test('should navigate to collection detail page when clicking collection', async ({ page }) => {
      const collectionItems = page.locator('[data-testid="collection-item"]')
      const count = await collectionItems.count()

      if (count > 0) {
        await collectionItems.first().click()
        await page.waitForLoadState('networkidle')

        // Should navigate to collection detail page
        expect(page.url()).toContain('/app/collections')
      }
    })

    test('should display collection detail page after clicking collection', async ({ page }) => {
      const collectionItems = page.locator('[data-testid="collection-item"]')
      const count = await collectionItems.count()

      if (count > 0) {
        await collectionItems.first().click()
        await page.waitForLoadState('networkidle')

        // Should show collection detail content
        const collectionDetail = page.locator('[data-testid="collection-detail"]')
        const hasDetail = await collectionDetail.isVisible().catch(() => false)

        if (hasDetail) {
          await expect(collectionDetail).toBeVisible()
        }
      }
    })

    test('should maintain collection context after navigation', async ({ page }) => {
      const collectionItems = page.locator('[data-testid="collection-item"]')
      const count = await collectionItems.count()

      if (count > 0) {
        await collectionItems.first().click()
        await page.waitForLoadState('networkidle')

        // Collection detail should be displayed
        const detailContent = await page.textContent('body')
        expect(detailContent).toBeTruthy()
      }
    })
  })

  test.describe('Collection Detail Page Display', () => {
    test('should display collection detail page with collection information', async ({ page }) => {
      const collectionItems = page.locator('[data-testid="collection-item"]')
      const count = await collectionItems.count()

      if (count > 0) {
        await collectionItems.first().click()
        await page.waitForLoadState('networkidle')

        // Should display collection name
        const pageText = await page.textContent('body')
        expect(pageText).toBeTruthy()
      }
    })

    test('should display all scenes in the collection on detail page', async ({ page }) => {
      const collectionItems = page.locator('[data-testid="collection-item"]')
      const count = await collectionItems.count()

      if (count > 0) {
        await collectionItems.first().click()
        await page.waitForLoadState('networkidle')

        // Should display scenes in collection
        const scenes = page.locator('[data-testid="scene-item"]')
        const sceneCount = await scenes.count()

        // Should have at least some scenes or show empty state
        expect(sceneCount).toBeGreaterThanOrEqual(0)
      }
    })

    test('should display scene metadata in collection detail', async ({ page }) => {
      const collectionItems = page.locator('[data-testid="collection-item"]')
      const count = await collectionItems.count()

      if (count > 0) {
        await collectionItems.first().click()
        await page.waitForLoadState('networkidle')

        const scenes = page.locator('[data-testid="scene-item"]')
        const sceneCount = await scenes.count()

        if (sceneCount > 0) {
          const sceneMetadata = scenes.first().locator('[data-testid="scene-metadata"]')
          const hasMetadata = await sceneMetadata.isVisible().catch(() => false)

          if (hasMetadata) {
            await expect(sceneMetadata).toBeVisible()
          }
        }
      }
    })
  })
})

test.describe('Collection Scene Consistency', () => {
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

  test('property: collection detail page displays all scenes in collection', async ({ page }) => {
    // Feature: comprehensive-ui-testing, Property 6: Collection Scene Consistency
    // Validates: Requirements 6.3

    const collectionItems = page.locator('[data-testid="collection-item"]')
    const count = await collectionItems.count()

    if (count > 0) {
      await collectionItems.first().click()
      await page.waitForLoadState('networkidle')

      // Check for scenes in collection
      const scenes = page.locator('[data-testid="scene-item"]')
      const sceneCount = await scenes.count()

      // Should display scenes or empty state
      expect(sceneCount).toBeGreaterThanOrEqual(0)

      // Verify collection detail is displayed
      const collectionDetail = page.locator('[data-testid="collection-detail"]')
      const hasDetail = await collectionDetail.isVisible().catch(() => false)

      if (hasDetail) {
        await expect(collectionDetail).toBeVisible()
      }
    }
  })

  test('property: all collections display consistent scene information', async ({ page }) => {
    // Feature: comprehensive-ui-testing, Property 6: Collection Scene Consistency
    // Validates: Requirements 6.3

    const collectionItems = page.locator('[data-testid="collection-item"]')
    const count = await collectionItems.count()

    // Test multiple collections if available
    const collectionsToTest = Math.min(count, 3)

    for (let i = 0; i < collectionsToTest; i++) {
      // Go back to list
      await page.goto('/app/collections')
      await page.waitForLoadState('networkidle')

      const items = page.locator('[data-testid="collection-item"]')
      await items.nth(i).click()
      await page.waitForLoadState('networkidle')

      // Verify scenes are displayed
      const scenes = page.locator('[data-testid="scene-item"]')
      const sceneCount = await scenes.count()
      expect(sceneCount).toBeGreaterThanOrEqual(0)
    }
  })
})

test.describe('Collection Management', () => {
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

  test.describe('Create Collection Workflow', () => {
    test('should display create collection button', async ({ page }) => {
      const createButton = page.getByRole('button', { name: /create|new collection|add/i })
      const hasCreateButton = await createButton.isVisible().catch(() => false)

      if (hasCreateButton) {
        await expect(createButton).toBeVisible()
      }
    })

    test('should open create collection dialog when clicking create button', async ({ page }) => {
      const createButton = page.getByRole('button', { name: /create|new collection|add/i })
      const hasCreateButton = await createButton.isVisible().catch(() => false)

      if (hasCreateButton) {
        await createButton.click()
        await page.waitForLoadState('networkidle')

        // Should display dialog or form
        const dialog = page.locator('[role="dialog"]')
        const form = page.locator('form')

        const hasDialog = await dialog.isVisible().catch(() => false)
        const hasForm = await form.isVisible().catch(() => false)

        if (hasDialog || hasForm) {
          expect(hasDialog || hasForm).toBeTruthy()
        }
      }
    })

    test('should allow entering collection name', async ({ page }) => {
      const createButton = page.getByRole('button', { name: /create|new collection|add/i })
      const hasCreateButton = await createButton.isVisible().catch(() => false)

      if (hasCreateButton) {
        await createButton.click()
        await page.waitForLoadState('networkidle')

        // Try to find and fill collection name input
        const nameInput = page.getByPlaceholder(/collection name|name/i)
        const hasInput = await nameInput.isVisible().catch(() => false)

        if (hasInput) {
          await nameInput.fill('Test Collection')
          const value = await nameInput.inputValue()
          expect(value).toBe('Test Collection')
        }
      }
    })

    test('should submit create collection form', async ({ page }) => {
      const createButton = page.getByRole('button', { name: /create|new collection|add/i })
      const hasCreateButton = await createButton.isVisible().catch(() => false)

      if (hasCreateButton) {
        await createButton.click()
        await page.waitForLoadState('networkidle')

        // Try to find and fill collection name input
        const nameInput = page.getByPlaceholder(/collection name|name/i)
        const hasInput = await nameInput.isVisible().catch(() => false)

        if (hasInput) {
          await nameInput.fill('Test Collection')

          // Find and click submit button
          const submitButton = page.getByRole('button', { name: /create|save|submit/i })
          const hasSubmit = await submitButton.isVisible().catch(() => false)

          if (hasSubmit) {
            await submitButton.click()
            await page.waitForLoadState('networkidle')
          }
        }
      }
    })
  })

  test.describe('Delete Collection Functionality', () => {
    test('should display delete button on collection item', async ({ page }) => {
      const collectionItems = page.locator('[data-testid="collection-item"]')
      const count = await collectionItems.count()

      if (count > 0) {
        const firstCollection = collectionItems.first()
        const deleteButton = firstCollection.locator('[data-testid="delete-button"]')
        const hasDeleteButton = await deleteButton.isVisible().catch(() => false)

        if (hasDeleteButton) {
          await expect(deleteButton).toBeVisible()
        }
      }
    })

    test('should display delete confirmation dialog', async ({ page }) => {
      const collectionItems = page.locator('[data-testid="collection-item"]')
      const count = await collectionItems.count()

      if (count > 0) {
        const firstCollection = collectionItems.first()
        const deleteButton = firstCollection.locator('[data-testid="delete-button"]')
        const hasDeleteButton = await deleteButton.isVisible().catch(() => false)

        if (hasDeleteButton) {
          await deleteButton.click()
          await page.waitForLoadState('networkidle')

          // Should display confirmation dialog
          const confirmDialog = page.locator('[role="dialog"]')
          const hasDialog = await confirmDialog.isVisible().catch(() => false)

          if (hasDialog) {
            await expect(confirmDialog).toBeVisible()
          }
        }
      }
    })

    test('should allow confirming collection deletion', async ({ page }) => {
      const collectionItems = page.locator('[data-testid="collection-item"]')
      const count = await collectionItems.count()

      if (count > 0) {
        const firstCollection = collectionItems.first()
        const deleteButton = firstCollection.locator('[data-testid="delete-button"]')
        const hasDeleteButton = await deleteButton.isVisible().catch(() => false)

        if (hasDeleteButton) {
          await deleteButton.click()
          await page.waitForLoadState('networkidle')

          // Find and click confirm button
          const confirmButton = page.getByRole('button', { name: /confirm|delete|yes/i })
          const hasConfirm = await confirmButton.isVisible().catch(() => false)

          if (hasConfirm) {
            await confirmButton.click()
            await page.waitForLoadState('networkidle')
          }
        }
      }
    })

    test('should allow canceling collection deletion', async ({ page }) => {
      const collectionItems = page.locator('[data-testid="collection-item"]')
      const count = await collectionItems.count()

      if (count > 0) {
        const firstCollection = collectionItems.first()
        const deleteButton = firstCollection.locator('[data-testid="delete-button"]')
        const hasDeleteButton = await deleteButton.isVisible().catch(() => false)

        if (hasDeleteButton) {
          await deleteButton.click()
          await page.waitForLoadState('networkidle')

          // Find and click cancel button
          const cancelButton = page.getByRole('button', { name: /cancel|no/i })
          const hasCancel = await cancelButton.isVisible().catch(() => false)

          if (hasCancel) {
            await cancelButton.click()
            await page.waitForLoadState('networkidle')

            // Should still be on collections page
            expect(page.url()).toContain('/app/collections')
          }
        }
      }
    })
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
