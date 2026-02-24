import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByPlaceholder('Email').fill('admin@example.com')
    await page.getByPlaceholder('Password').fill('admin')
    await page.getByRole('button', { name: /sign in/i }).click()
})

test.describe('Setup Flow - Display and Navigation', () => {
    test.describe('Setup Display for New Users', () => {
        test('should display onboarding title and description', async ({ page }) => {
            await page.goto('/app/setup')
            await page.waitForLoadState('networkidle')

            // Should display main title
            const title = page.getByText("Meet Edit Mind")
            await expect(title).toBeVisible()

        })


        test('should display onboarding skip button', async ({ page }) => {
            await page.goto('/app/setup')
            await page.waitForLoadState('networkidle')

            // Should display skip button
            const skipButton = page.getByRole('button', { name: /skip/i })
            await expect(skipButton).toBeVisible()
        })
    })

    test.describe('Setup Step Progression', () => {
        test('should skip through onboarding steps sequentially', async ({ page }) => {
            await page.goto('/app/setup')
            await page.waitForLoadState('networkidle')

            // Step 1: Initial onboarding screen
            await expect(page.getByText("Meet Edit Mind")).toBeVisible()
            const skip = page.getByRole('button', { name: 'Skip' })
            await expect(skip).toBeVisible()

            // Click to go to Step 2
            await skip.click()
            await page.waitForLoadState('networkidle')

            // Step 2: Should display different content
            const step2Text = page.getByText("Starting the engine")
            await step2Text.waitFor({ state: 'visible', timeout: 1000 * 10 })
            await expect(step2Text).toBeVisible()

            // Click to go to Step 3
            await skip.click()
            await page.waitForLoadState('networkidle')

            // Step 3: Should display different step content
            const step3Text = page.getByText("Choose your library")
            await step3Text.waitFor({ state: 'visible', timeout: 1000 * 10 })
            await expect(step3Text).toBeVisible()
            await skip.click()

            // Step 4: Should display last step content
            const step4Text = page.getByText("Indexing your library")
            await step4Text.waitFor({ state: 'visible', timeout: 1000 * 10 })
            await expect(step4Text).toBeVisible()

            const lastStepButton = page.getByRole('button', { name: "Open Edit Mind" })
            await expect(lastStepButton).toBeVisible()
        })

        test('should display skip button on each step', async ({ page }) => {
            await page.goto('/app/setup')
            await page.waitForLoadState('networkidle')

            // Step 1 should have Continue button
            const skipButton = page.getByRole('button', { name: /Skip/i })
            await expect(skipButton).toBeVisible()

            // Click to step 2
            await skipButton.click()
            await page.waitForLoadState('networkidle')

            // Click to step 3
            await skipButton.click()
            await page.waitForLoadState('networkidle')

            // Click to step 4
            await skipButton.click()
            await page.waitForLoadState('networkidle')

            // Step 4 should have Get Started button (final step)
            const lastStepButton = page.getByRole('button', { name: "Open Edit Mind" })
            await expect(lastStepButton).toBeVisible()
        })

        test('should continue through onboarding steps sequentially', async ({ page }) => {
            await page.goto('/app/setup')
            await page.waitForLoadState('networkidle')

            // Step 1: Initial onboarding screen
            await expect(page.getByText("Meet Edit Mind")).toBeVisible()
            const continueButton = page.getByRole('button', { name: 'Continue' })
            const skipButton = page.getByRole('button', { name: 'Skip' })

            await expect(continueButton).toBeVisible()

            // Click to go to Step 2
            await continueButton.click()
            await page.waitForLoadState('networkidle')

            // Step 2: Should display different content
            const step2Text = page.getByText("Starting the engine")
            await step2Text.waitFor({ state: 'visible', timeout: 1000 * 10 })
            await expect(step2Text).toBeVisible()

            // Skip engine starting for now
            await skipButton.click()
            await page.waitForLoadState('networkidle')

            // Step 3: Should display different step content
            await page.route('**/api/media/folders?**', async (route) => {
                const folders = [
                    {
                        isDirectory: true,
                        path: '/path/to/your/videos',
                        name: 'videos',
                    },
                ]
                await route.fulfill({ json: { folders } })
            })

            await page.route('**/api/folders', async (route) => {
                const request = route.request()

                if (request.method() !== 'POST') {
                    return route.continue()
                }

                const json = {
                    folder: {
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
                }

                await route.fulfill({ json, status: 200 })
            })


            const step3Text = page.getByText("Choose your library")
            await step3Text.waitFor({ state: 'visible', timeout: 1000 * 10 })
            await expect(step3Text).toBeVisible()
            const selectFolderButton = page.getByRole('button', { name: 'Select your first folder' })
            await selectFolderButton.click()

            const folderPath = page.getByText('videos',)
            await expect(folderPath).toBeVisible()

            const chooseFolderButton = page.getByRole('button', { name: 'Select' }).last()
            await chooseFolderButton.click()

            const addFolderButton = page.getByRole('button', { name: 'Add Folder' })
            await addFolderButton.click()
            await continueButton.click()

            // Step 4: Should display last step content
            const step4Text = page.getByText("Indexing your library")
            await step4Text.waitFor({ state: 'visible', timeout: 1000 * 10 })
            await expect(step4Text).toBeVisible()
            
            const lastStepButton = page.getByRole('button', { name: "Open Edit Mind" })
            await expect(lastStepButton).toBeVisible()

        })
    })
})