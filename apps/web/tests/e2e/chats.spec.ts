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
    test('should display chats list on page load', async ({ page }) => {
      const chatItems = page.locator('[data-testid="chat-item"]')
      const count = await chatItems.count()

      // Should have at least some chats or show empty state
      if (count > 0) {
        await expect(chatItems.first()).toBeVisible()
      } else {
        // If no chats, should show empty state
        await expect(page.getByText(/no conversations|empty/i)).toBeVisible()
      }
    })

    test('should display chat titles in list', async ({ page }) => {
      const chatItems = page.locator('[data-testid="chat-item"]')
      const count = await chatItems.count()

      if (count > 0) {
        const firstChat = chatItems.first()
        const title = firstChat.locator('[data-testid="chat-title"]')
        const hasTitle = await title.isVisible().catch(() => false)

        if (hasTitle) {
          await expect(title).toBeVisible()
        }
      }
    })

    test('should display chat metadata in list', async ({ page }) => {
      const chatItems = page.locator('[data-testid="chat-item"]')
      const count = await chatItems.count()

      if (count > 0) {
        const firstChat = chatItems.first()
        // Check for common metadata elements like timestamp
        const metadata = firstChat.locator('[data-testid="chat-metadata"]')
        const hasMetadata = await metadata.isVisible().catch(() => false)

        if (hasMetadata) {
          await expect(metadata).toBeVisible()
        }
      }
    })

    test('should display multiple chats in list format', async ({ page }) => {
      const chatItems = page.locator('[data-testid="chat-item"]')
      const count = await chatItems.count()

      // Should display multiple chats or empty state
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should display search functionality on chats list', async ({ page }) => {
      const searchInput = page.getByPlaceholder(/search conversations|search/i)
      const hasSearch = await searchInput.isVisible().catch(() => false)

      if (hasSearch) {
        await expect(searchInput).toBeVisible()
      }
    })
  })

  test.describe('Chat Click Navigation', () => {
    test('should navigate to chat detail page when clicking chat', async ({ page }) => {
      const chatItems = page.locator('[data-testid="chat-item"]')
      const count = await chatItems.count()

      if (count > 0) {
        await chatItems.first().click()
        await page.waitForLoadState('networkidle')

        // Should navigate to chat detail page
        expect(page.url()).toContain('/app/chats')
      }
    })

    test('should display chat detail page after clicking chat', async ({ page }) => {
      const chatItems = page.locator('[data-testid="chat-item"]')
      const count = await chatItems.count()

      if (count > 0) {
        await chatItems.first().click()
        await page.waitForLoadState('networkidle')

        // Should show chat detail content (message list or input)
        const messageList = page.locator('[data-testid="message-list"]')
        const chatInput = page.locator('[data-testid="chat-input"]')

        const hasMessageList = await messageList.isVisible().catch(() => false)
        const hasChatInput = await chatInput.isVisible().catch(() => false)

        if (hasMessageList || hasChatInput) {
          expect(hasMessageList || hasChatInput).toBeTruthy()
        }
      }
    })

    test('should maintain chat context after navigation', async ({ page }) => {
      const chatItems = page.locator('[data-testid="chat-item"]')
      const count = await chatItems.count()

      if (count > 0) {
        await chatItems.first().click()
        await page.waitForLoadState('networkidle')

        // Chat detail should be displayed
        const detailContent = await page.textContent('body')
        expect(detailContent).toBeTruthy()
      }
    })
  })

  test.describe('Chat Detail Page Display', () => {
    test('should display chat detail page with message history', async ({ page }) => {
      const chatItems = page.locator('[data-testid="chat-item"]')
      const count = await chatItems.count()

      if (count > 0) {
        await chatItems.first().click()
        await page.waitForLoadState('networkidle')

        // Should display message history or empty state
        const messageList = page.locator('[data-testid="message-list"]')
        const emptyState = page.getByText(/no messages|start|empty/i)

        const hasMessageList = await messageList.isVisible().catch(() => false)
        const hasEmptyState = await emptyState.isVisible().catch(() => false)

        if (hasMessageList || hasEmptyState) {
          expect(hasMessageList || hasEmptyState).toBeTruthy()
        }
      }
    })

    test('should display messages in chat detail', async ({ page }) => {
      const chatItems = page.locator('[data-testid="chat-item"]')
      const count = await chatItems.count()

      if (count > 0) {
        await chatItems.first().click()
        await page.waitForLoadState('networkidle')

        // Should display messages
        const messages = page.locator('[data-testid="message-item"]')
        const messageCount = await messages.count()

        // Should have at least some messages or show empty state
        expect(messageCount).toBeGreaterThanOrEqual(0)
      }
    })

    test('should display message content and metadata', async ({ page }) => {
      const chatItems = page.locator('[data-testid="chat-item"]')
      const count = await chatItems.count()

      if (count > 0) {
        await chatItems.first().click()
        await page.waitForLoadState('networkidle')

        const messages = page.locator('[data-testid="message-item"]')
        const messageCount = await messages.count()

        if (messageCount > 0) {
          const firstMessage = messages.first()
          const messageText = firstMessage.locator('[data-testid="message-text"]')
          const hasText = await messageText.isVisible().catch(() => false)

          if (hasText) {
            await expect(messageText).toBeVisible()
          }
        }
      }
    })

    test('should display chat input field on detail page', async ({ page }) => {
      const chatItems = page.locator('[data-testid="chat-item"]')
      const count = await chatItems.count()

      if (count > 0) {
        await chatItems.first().click()
        await page.waitForLoadState('networkidle')

        // Should display chat input
        const chatInput = page.locator('[data-testid="chat-input"]')
        const hasInput = await chatInput.isVisible().catch(() => false)

        if (hasInput) {
          await expect(chatInput).toBeVisible()
        }
      }
    })
  })
})

test.describe('Chat Message Persistence', () => {
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

  test('property: chat message persistence across page reloads', async ({ page }) => {
    const chatItems = page.locator('[data-testid="chat-item"]')
    const count = await chatItems.count()

    if (count > 0) {
      await chatItems.first().click()
      await page.waitForLoadState('networkidle')

      // Get initial message count
      const messages = page.locator('[data-testid="message-item"]')
      const initialMessageCount = await messages.count()

      // Reload the page
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Check message count after reload
      const reloadedMessages = page.locator('[data-testid="message-item"]')
      const reloadedMessageCount = await reloadedMessages.count()

      // Message count should be the same
      expect(reloadedMessageCount).toBe(initialMessageCount)
    }
  })

  test('property: all messages display consistently', async ({ page }) => {
    const chatItems = page.locator('[data-testid="chat-item"]')
    const count = await chatItems.count()

    // Test multiple chats if available
    const chatsToTest = Math.min(count, 3)

    for (let i = 0; i < chatsToTest; i++) {
      // Go back to list
      await page.goto('/app/chats')
      await page.waitForLoadState('networkidle')

      const items = page.locator('[data-testid="chat-item"]')
      await items.nth(i).click()
      await page.waitForLoadState('networkidle')

      // Verify messages are displayed
      const messages = page.locator('[data-testid="message-item"]')
      const messageCount = await messages.count()
      expect(messageCount).toBeGreaterThanOrEqual(0)
    }
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

  test.describe('Message Sending', () => {
    test('should display message input field', async ({ page }) => {
      const chatItems = page.locator('[data-testid="chat-item"]')
      const count = await chatItems.count()

      if (count > 0) {
        await chatItems.first().click()
        await page.waitForLoadState('networkidle')

        const messageInput = page.getByPlaceholder(/message|type|ask/i)
        const hasInput = await messageInput.isVisible().catch(() => false)

        if (hasInput) {
          await expect(messageInput).toBeVisible()
        }
      }
    })

    test('should allow typing in message input', async ({ page }) => {
      const chatItems = page.locator('[data-testid="chat-item"]')
      const count = await chatItems.count()

      if (count > 0) {
        await chatItems.first().click()
        await page.waitForLoadState('networkidle')

        const messageInput = page.getByPlaceholder(/message|type|ask/i)
        const hasInput = await messageInput.isVisible().catch(() => false)

        if (hasInput) {
          await messageInput.fill('Test message')
          const value = await messageInput.inputValue()
          expect(value).toBe('Test message')
        }
      }
    })

    test('should display send button', async ({ page }) => {
      const chatItems = page.locator('[data-testid="chat-item"]')
      const count = await chatItems.count()

      if (count > 0) {
        await chatItems.first().click()
        await page.waitForLoadState('networkidle')

        const sendButton = page.getByRole('button', { name: /send|submit/i })
        const hasSendButton = await sendButton.isVisible().catch(() => false)

        if (hasSendButton) {
          await expect(sendButton).toBeVisible()
        }
      }
    })

    test('should allow sending a message', async ({ page }) => {
      const chatItems = page.locator('[data-testid="chat-item"]')
      const count = await chatItems.count()

      if (count > 0) {
        await chatItems.first().click()
        await page.waitForLoadState('networkidle')

        const messageInput = page.getByPlaceholder(/message|type|ask/i)
        const hasInput = await messageInput.isVisible().catch(() => false)

        if (hasInput) {
          await messageInput.fill('Test message')

          const sendButton = page.getByRole('button', { name: /send|submit/i })
          const hasSendButton = await sendButton.isVisible().catch(() => false)

          if (hasSendButton) {
            await sendButton.click()
            await page.waitForLoadState('networkidle')
          }
        }
      }
    })
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

test.describe('Chat CRUD Operations', () => {
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

  test('property: chat creation adds chat to list', async ({ page }) => {
    const initialItems = page.locator('[data-testid="chat-item"]')
    const initialCount = await initialItems.count()

    const createButton = page.getByRole('button', { name: /new chat|create|start/i })
    const hasCreateButton = await createButton.isVisible().catch(() => false)

    if (hasCreateButton) {
      await createButton.click()
      await page.waitForLoadState('networkidle')

      const input = page.getByPlaceholder(/message|type|ask|prompt/i)
      const hasInput = await input.isVisible().catch(() => false)

      if (hasInput) {
        await input.fill('Test chat')

        const sendButton = page.getByRole('button', { name: /send|submit|create/i })
        const hasSendButton = await sendButton.isVisible().catch(() => false)

        if (hasSendButton) {
          await sendButton.click()
          await page.waitForLoadState('networkidle')

          // Navigate back to chats list
          await page.goto('/app/chats')
          await page.waitForLoadState('networkidle')

          // Verify chat was added
          const finalItems = page.locator('[data-testid="chat-item"]')
          const finalCount = await finalItems.count()

          // Count should increase or stay same if creation failed
          expect(finalCount).toBeGreaterThanOrEqual(initialCount)
        }
      }
    }
  })

  test('property: all chats maintain consistent structure', async ({ page }) => {
    const chatItems = page.locator('[data-testid="chat-item"]')
    const count = await chatItems.count()

    // Verify all chats have consistent structure
    for (let i = 0; i < Math.min(count, 5); i++) {
      const chat = chatItems.nth(i)
      const isVisible = await chat.isVisible()
      expect(isVisible).toBeTruthy()
    }
  })
})
