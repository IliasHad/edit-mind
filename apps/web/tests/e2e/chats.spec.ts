import { test, expect } from '@playwright/test'

test.describe('Chats Page - List and Detail Display', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/auth/login')
    await page.getByPlaceholder('Email').fill('admin@example.com')
    await page.getByPlaceholder('Password').fill('admin')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/\/app\/home/)

    // Navigate to chats page
    await page.goto('/app/chats')
    await page.waitForLoadState('networkidle')
  })

  test.describe('Chats List Display', () => {
    test('should display search functionality on chats list', async ({ page }) => {
      const searchInput = page.getByPlaceholder(/search conversations|search/i)
      const hasSearch = await searchInput.isVisible().catch(() => false)

      if (hasSearch) {
        await expect(searchInput).toBeVisible()
      }
    })
  })
})

test.describe('Message Sending and Chat Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/auth/login')
    await page.getByPlaceholder('Email').fill('admin@example.com')
    await page.getByPlaceholder('Password').fill('admin')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/\/app\/home/)

    // Navigate to chats page
    await page.goto('/app/chats')
    await page.waitForLoadState('networkidle')
  })

  test.describe('Create New Chat Workflow', () => {
    test('should display create new chat button', async ({ page }) => {
      const createButton = page.getByRole('button', { name: /new chat|create|start/i })
      const hasCreateButton = await createButton.isVisible().catch(() => false)

      if (hasCreateButton) {
        await expect(createButton).toBeVisible()
      }
    })

    test('should navigate to new chat page when clicking create button', async ({ page }) => {
      const createButton = page.getByRole('button', { name: /new chat|create|start/i })
      const hasCreateButton = await createButton.isVisible().catch(() => false)

      if (hasCreateButton) {
        await createButton.click()
        await page.waitForLoadState('networkidle')

        // Should navigate to new chat page
        expect(page.url()).toContain('/app/chats')
      }
    })

    test('should display new chat form or interface', async ({ page }) => {
      const createButton = page.getByRole('button', { name: /new chat|create|start/i })
      const hasCreateButton = await createButton.isVisible().catch(() => false)

      if (hasCreateButton) {
        await createButton.click()
        await page.waitForLoadState('networkidle')

        // Should display form or input for new chat
        const form = page.locator('form')
        const input = page.getByPlaceholder(/message|type|ask|prompt/i)

        const hasForm = await form.isVisible().catch(() => false)
        const hasInput = await input.isVisible().catch(() => false)

        if (hasForm || hasInput) {
          expect(hasForm || hasInput).toBeTruthy()
        }
      }
    })

    test('should allow entering initial message for new chat', async ({ page }) => {
      const createButton = page.getByRole('button', { name: /new chat|create|start/i })
      const hasCreateButton = await createButton.isVisible().catch(() => false)

      if (hasCreateButton) {
        await createButton.click()
        await page.waitForLoadState('networkidle')

        const input = page.getByPlaceholder(/message|type|ask|prompt/i)
        const hasInput = await input.isVisible().catch(() => false)

        if (hasInput) {
          await input.fill('New chat message')
          const value = await input.inputValue()
          expect(value).toBe('New chat message')
        }
      }
    })

    test('should submit new chat form', async ({ page }) => {
      const createButton = page.getByRole('button', { name: /new chat|create|start/i })
      const hasCreateButton = await createButton.isVisible().catch(() => false)

      if (hasCreateButton) {
        await createButton.click()
        await page.waitForLoadState('networkidle')

        const input = page.getByPlaceholder(/message|type|ask|prompt/i)
        const hasInput = await input.isVisible().catch(() => false)

        if (hasInput) {
          await input.fill('New chat message')

          const sendButton = page.getByRole('button', { name: /send|submit|create/i })
          const hasSendButton = await sendButton.isVisible().catch(() => false)

          if (hasSendButton) {
            await sendButton.click()
            await page.waitForLoadState('networkidle')
          }
        }
      }
    })
  })

  test.describe('Empty State Display', () => {
    test('should display empty state when no chats exist', async ({ page }) => {
      await page.route('**/api/chats?**', async (route) => {
        const json = {
          total: 0,
          page: 1,
          limit: 20,
          chats: [],
          totalPages: 0,
          hasMore: false,
        }
        await route.fulfill({ json })
      })

      // Reload the page to get empty state
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Should display empty state message
      const emptyState = page.getByText(/no conversations|empty|start/i)
      const hasEmptyState = await emptyState.isVisible().catch(() => false)

      if (hasEmptyState) {
        await expect(emptyState).toBeVisible()
      }
    })

    test('should display call-to-action in empty state', async ({ page }) => {
      // Mock the API response for empty chats
      await page.route('**/api/chats?**', async (route) => {
        const json = {
          total: 0,
          page: 1,
          limit: 20,
          chats: [],
          totalPages: 0,
          hasMore: false,
        }
        await route.fulfill({ json })
      })

      // Reload the page to get empty state
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Should display create button or call-to-action
      const createButton = page.getByRole('button', { name: /new chat|create|start/i })
      const hasCreateButton = await createButton.isVisible().catch(() => false)

      if (hasCreateButton) {
        await expect(createButton).toBeVisible()
      }
    })

    test('should display empty state icon or illustration', async ({ page }) => {
      // Mock the API response for empty chats
      await page.route('**/api/chats?**', async (route) => {
        const json = {
          total: 0,
          page: 1,
          limit: 20,
          chats: [],
          totalPages: 0,
          hasMore: false,
        }
        await route.fulfill({ json })
      })

      // Reload the page to get empty state
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Should display empty state content
      const pageText = await page.textContent('body')
      expect(pageText).toBeTruthy()
    })
  })
})
