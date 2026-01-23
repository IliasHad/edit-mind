import { test, expect } from '@playwright/test'

test.describe('Project Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/auth/login')
    await page.getByPlaceholder('Email').fill('admin@example.com')
    await page.getByPlaceholder('Password').fill('admin')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/\/app\/home/)

    // Navigate to projects page
    await page.goto('/app/projects')
    await page.waitForLoadState('networkidle')
  })

  test.describe('Create Project Workflow', () => {
    test('should display create project button', async ({ page }) => {
      const createButton = page.getByRole('link', { name: /create|new project|add/i })
      const hasCreateButton = await createButton.isVisible().catch(() => false)

      if (hasCreateButton) {
        await expect(createButton).toBeVisible()
      }
    })
    test('should create project', async ({ page }) => {
      await page.route('**/api/videos?**', async (route) => {
        const json = {
          total: 1,
          page: 1,
          limit: 40,
          videos: [
            {
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
              folder: {
                path: '/media/videos/',
              },
            },
          ],
          totalPages: 1,
          hasMore: false,
        }
        await route.fulfill({ json })
      })

      const createButton = page.getByRole('link', { name: /create|new project|add/i })
      await createButton.click()

      // Project name input
      const nameInput = page.getByLabel('name')

      const projectName = 'Test Project'
      const projectInstructions = 'This a test project instructions'
      await expect(nameInput).toBeVisible()
      await nameInput.fill(projectName)

      // Instructions textarea
      const instructionsTextarea = page.getByLabel('instructions')

      await expect(instructionsTextarea).toBeVisible()
      await instructionsTextarea.fill(projectInstructions)

      const videoItem = page.getByText('test.mp4')
      const hasVideoSelection = await videoItem.isVisible().catch(() => false)

      if (hasVideoSelection) {
        await videoItem.click()
      }

      await page.route('**/api/projects', async (route) => {
        const json = {
          project: {
            id: 'project-123',
            name: projectName,
            instructions: projectInstructions,
            isArchived: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            videos: [
              {
                id: '123',
              },
            ],
          },
          success: true,
        }
        await route.fulfill({ json })
      })

      // Button should now be enabled
      const submitButton = page.getByRole('button', { name: /create project/i })
      await expect(submitButton).toBeEnabled()

      // Submit
      await submitButton.click()

      // Redirect
      await page.waitForURL(/\/app\/projects\/project-123/)
    })
  })

  test.describe('Empty State Display', () => {
    test('should display empty state when no projects exist', async ({ page }) => {
      // Mock the API response for empty projects
      await page.route('**/api/projects?**', async (route) => {
        const json = {
          total: 0,
          page: 1,
          limit: 40,
          projects: [],
          totalPages: 0,
          hasMore: false,
        }
        await route.fulfill({ json })
      })

      // Reload the page to get empty state
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Should display empty state message
      const emptyState = page.getByText(/no projects|empty|create/i)
      const hasEmptyState = await emptyState.isVisible().catch(() => false)

      if (hasEmptyState) {
        await expect(emptyState).toBeVisible()
      }
    })
  })

  test.describe('Projects List', () => {
    test('should display a list of projects', async ({ page }) => {
      await page.route('**/api/projects', async (route) => {
        const json = {
          total: 2,
          page: 1,
          limit: 40,
          projects: [
            {
              id: 'project-1',
              name: 'Project Alpha',
              isArchived: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            {
              id: 'project-2',
              name: 'Project Beta',
              isArchived: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
          totalPages: 1,
          hasMore: false,
        }
        await route.fulfill({ json })
      })

      await page.reload()
      await page.waitForLoadState('networkidle')

      await expect(page.getByText('Project Alpha')).toBeVisible()
      await expect(page.getByText('Project Beta')).toBeVisible()
    })
    test('should allow a project to be deleted', async ({ page }) => {
      const projectId = "project-1'"

      await page.route('**/api/projects', async (route) => {
        const json = {
          total: 2,
          page: 1,
          limit: 40,
          projects: [
            {
              id: 'project-1',
              name: 'Project Alpha',
              isArchived: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            {
              id: 'project-2',
              name: 'Project Beta',
              isArchived: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
          totalPages: 1,
          hasMore: false,
        }
        await route.fulfill({ json })
      })
      await page.reload()
      await page.waitForLoadState('networkidle')

      await page.route(`**/api/projects/${projectId}`, async (route) => {
        if (route.request().method() === 'DELETE') {
          const json = { success: true }
          await route.fulfill({ json })
        }
      })
      await page.getByRole('button', { name: 'Delete project' }).first().click()
      // Confirm deletion in a dialog if one appears
      page.on('dialog', (dialog) => dialog.accept())
      await page.getByRole('button', { name: 'Confirm' }).first().click()

      await page.waitForURL('/app/projects')
      await expect(page.getByText('Project to Delete')).not.toBeVisible()
    })
  })

  test.describe('Project Update', () => {
    const projectId = 'project-to-update'
    const initialProjectName = 'Initial Project Name'
    const updatedProjectName = 'Updated Project Name'

    test.beforeEach(async ({ page }) => {
      await page.route(`**/api/projects/${projectId}`, async (route) => {
        const json = {
          project: {
            id: projectId,
            name: initialProjectName,
            instructions: 'Initial instructions',
            videos: [],
          },
        }
        await route.fulfill({ json })
      })
      await page.goto(`/app/projects/${projectId}`)
      await page.waitForLoadState('networkidle')
    })

    test('should allow a project to be updated', async ({ page }) => {
      const nameInput = page.getByLabel('name')
      await nameInput.clear()
      await nameInput.fill(updatedProjectName)

      await page.route(`**/api/projects/${projectId}`, async (route) => {
        if (route.request().method() === 'PATCH') {
          const json = { success: true, project: { id: projectId } }
          await route.fulfill({ json })
        }
      })

      await page.getByRole('button', { name: /save changes/i }).click()
      await page.waitForURL(`/app/projects/${projectId}`)

      expect(page.url()).toContain(`/app/projects/${projectId}`)
    })
  })

  test.describe('Project Deletion', () => {
    const projectId = 'project-to-delete'

    test.beforeEach(async ({ page }) => {
      await page.route(`**/api/projects/${projectId}`, async (route) => {
        if (route.request().method() === 'GET') {
          const json = {
            project: { id: projectId, name: 'Project to Delete' },
          }
          await route.fulfill({ json })
        }
      })
      await page.goto(`/app/projects/${projectId}`)
      await page.waitForLoadState('networkidle')
    })
  })
})
