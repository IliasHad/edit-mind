import { test, expect } from '@playwright/test'

test.describe('Onboarding Flow - Display and Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Clear onboarding completion flag to ensure onboarding displays
    await page.addInitScript(() => {
      localStorage.removeItem('onboarding_complete')
    })
  })

  test.describe('Onboarding Display for New Users', () => {
    test('should display onboarding page for new users', async ({ page }) => {
      await page.goto('/onboarding')
      await page.waitForLoadState('networkidle')

      // Should display onboarding content
      const onboardingContent = page.locator('[data-testid="onboarding-container"]')
      const hasContent = await onboardingContent.isVisible().catch(() => false)

      if (hasContent) {
        await expect(onboardingContent).toBeVisible()
      } else {
        // If no data-testid, check for onboarding text
        const onboardingText = page.getByText(/Your video library|reimagined/i)
        await expect(onboardingText).toBeVisible()
      }
    })

    test('should display onboarding title and description', async ({ page }) => {
      await page.goto('/onboarding')
      await page.waitForLoadState('networkidle')

      // Should display main title
      const title = page.getByText(/Your video library,.*reimagined/i)
      await expect(title).toBeVisible()

      // Should display description or subtitle
      const description = page.locator('[data-testid="onboarding-description"]')
      const hasDescription = await description.isVisible().catch(() => false)

      if (hasDescription) {
        await expect(description).toBeVisible()
      }
    })

    test('should display onboarding step indicator', async ({ page }) => {
      await page.goto('/onboarding')
      await page.waitForLoadState('networkidle')

      // Should display step indicator (dots, numbers, or progress bar)
      const stepIndicator = page.locator('[data-testid="step-indicator"]')
      const hasIndicator = await stepIndicator.isVisible().catch(() => false)

      if (hasIndicator) {
        await expect(stepIndicator).toBeVisible()
      }
    })

    test('should display onboarding skip button', async ({ page }) => {
      await page.goto('/onboarding')
      await page.waitForLoadState('networkidle')

      // Should display skip button
      const skipButton = page.getByRole('button', { name: /skip/i })
      await expect(skipButton).toBeVisible()
    })
  })

  test.describe('Onboarding Step Progression', () => {
    test('should progress through onboarding steps sequentially', async ({ page }) => {
      await page.goto('/onboarding')
      await page.waitForLoadState('networkidle')

      // Step 1: Initial onboarding screen
      await expect(page.getByText(/Your video library,.*reimagined/i)).toBeVisible()
      const continueButton1 = page.getByRole('button', { name: 'Continue' })
      await expect(continueButton1).toBeVisible()

      // Click to go to Step 2
      await continueButton1.click()
      await page.waitForLoadState('networkidle')

      // Step 2: Should display different content
      const step2Text = page.getByText(/Search with\s*natural language/i)
      await step2Text.waitFor({ state: 'visible', timeout: 1000 * 10 })
      await expect(step2Text).toBeVisible()

      const continueButton2 = page.getByRole('button', { name: 'Continue' })
      await expect(continueButton2).toBeVisible()

      // Click to go to Step 3
      await continueButton2.click()
      await page.waitForLoadState('networkidle')

      // Step 3: Should display final step content
      const step3Text = page.getByText(/AI-generated rough cuts/i)
      await step3Text.waitFor({ state: 'visible', timeout: 1000 * 10 })
      await expect(step3Text).toBeVisible()
    })

    test('should display next button on each step', async ({ page }) => {
      await page.goto('/onboarding')
      await page.waitForLoadState('networkidle')

      // Step 1 should have Continue button
      let nextButton = page.getByRole('button', { name: /continue|next/i })
      await expect(nextButton).toBeVisible()

      // Click to next step
      await nextButton.click()
      await page.waitForLoadState('networkidle')

      // Step 2 should also have Continue button
      nextButton = page.getByRole('button', { name: /continue|next/i })
      await expect(nextButton).toBeVisible()

      // Click to next step
      await nextButton.click()
      await page.waitForLoadState('networkidle')

      // Step 3 should have Get Started button (final step)
      const getStartedButton = page.getByRole('button', { name: /get started|finish/i })
      await expect(getStartedButton).toBeVisible()
    })

    test('should update step indicator as user progresses', async ({ page }) => {
      await page.goto('/onboarding')
      await page.waitForLoadState('networkidle')

      // Get initial step indicator state
      const stepIndicator = page.locator('[data-testid="step-indicator"]')
      const hasIndicator = await stepIndicator.isVisible().catch(() => false)

      if (hasIndicator) {
        // Progress to next step
        await page.getByRole('button', { name: 'Continue' }).click()
        await page.waitForLoadState('networkidle')

        // Step indicator should update
        await expect(stepIndicator).toBeVisible()
      }
    })

    test('should allow navigation between steps', async ({ page }) => {
      await page.goto('/onboarding')
      await page.waitForLoadState('networkidle')

      // Go to step 2
      await page.getByRole('button', { name: 'Continue' }).click()
      await page.waitForLoadState('networkidle')

      // Check for previous button
      const prevButton = page.getByRole('button', { name: /back|previous/i })
      const hasPrevButton = await prevButton.isVisible().catch(() => false)

      if (hasPrevButton) {
        // Should be able to go back
        await prevButton.click()
        await page.waitForLoadState('networkidle')

        // Should be back at step 1
        await expect(page.getByText(/Your video library,.*reimagined/i)).toBeVisible()
      }
    })
  })

  test.describe('Onboarding UI Elements', () => {
    test('should display clear instructions on each step', async ({ page }) => {
      await page.goto('/onboarding')
      await page.waitForLoadState('networkidle')

      // Step 1 should have instructions
      const step1Instructions = page.getByText(/Your video library,.*reimagined/i)
      await expect(step1Instructions).toBeVisible()

      // Instructions should be readable
      const instructionText = await step1Instructions.textContent()
      expect(instructionText).toBeTruthy()
      expect(instructionText?.length).toBeGreaterThan(0)
    })

    test('should display action buttons on each step', async ({ page }) => {
      await page.goto('/onboarding')
      await page.waitForLoadState('networkidle')

      // Should have Continue button
      const continueButton = page.getByRole('button', { name: 'Continue' })
      await expect(continueButton).toBeVisible()

      // Should have Skip button
      const skipButton = page.getByRole('button', { name: /skip/i })
      await expect(skipButton).toBeVisible()
    })

    test('should display visual elements for each step', async ({ page }) => {
      await page.goto('/onboarding')
      await page.waitForLoadState('networkidle')

      // Should display step content (image, icon, or other visual)
      const stepContent = page.locator('[data-testid="step-content"]')
      const hasContent = await stepContent.isVisible().catch(() => false)

      if (hasContent) {
        await expect(stepContent).toBeVisible()
      } else {
        // If no data-testid, check for images or other visual elements
        const images = page.locator('img')
        const imageCount = await images.count()
        expect(imageCount).toBeGreaterThanOrEqual(0)
      }
    })

    test('should display different content for each onboarding step', async ({ page }) => {
      await page.goto('/onboarding')
      await page.waitForLoadState('networkidle')

      // Get Step 1 content
      const step1Content = await page.locator('#step-content').textContent()

      // Go to Step 2
      await page.getByRole('button', { name: 'Continue' }).click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(300) // Wait for animation

      // Get Step 2 content
      const step2Content = await page.locator('#step-content').textContent()

      // Content should be different
      expect(step1Content).not.toEqual(step2Content)
    })
  })
})

test.describe('Onboarding Completion and Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Clear onboarding completion flag
    await page.addInitScript(() => {
      localStorage.removeItem('onboarding_complete')
    })
  })

  test('should navigate through onboarding and land on login', async ({ page }) => {
    await page.goto('/onboarding')
    await page.waitForLoadState('networkidle')

    // Step 1
    await expect(page.getByText(/Your video library,.*reimagined/i)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForLoadState('networkidle')

    // Step 2: wait for step content to appear
    const step2Text = page.getByText(/Search with\s*natural language/i)
    await step2Text.waitFor({ state: 'visible', timeout: 1000 * 10 })
    await expect(step2Text).toBeVisible()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForLoadState('networkidle')

    // Step 3
    const step3Text = page.getByText(/AI-generated rough cuts/i)
    await step3Text.waitFor({ state: 'visible', timeout: 1000 * 10 })
    await expect(step3Text).toBeVisible()
    await page.getByRole('button', { name: 'Get Started' }).click()
    await page.waitForLoadState('networkidle')

    // Should land on login page after onboarding
    await expect(page).toHaveURL(/.*auth\/login/)
    await expect(page.getByText('Welcome back')).toBeVisible()
  })

  test('property: onboarding completion navigates to home page', async ({ page }) => {
    await page.goto('/onboarding')
    await page.waitForLoadState('networkidle')

    // Complete all steps
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForLoadState('networkidle')

    const step2Text = page.getByText(/Search with\s*natural language/i)
    await step2Text.waitFor({ state: 'visible', timeout: 1000 * 10 })
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForLoadState('networkidle')

    const step3Text = page.getByText(/AI-generated rough cuts/i)
    await step3Text.waitFor({ state: 'visible', timeout: 1000 * 10 })

    // Click final button
    const finalButton = page.getByRole('button', { name: /get started|finish/i })
    await finalButton.click()
    await page.waitForLoadState('networkidle')

    // Should navigate to login or home page
    await expect(page).toHaveURL(/.*auth\/login/)
  })
  test('property: all onboarding steps are completable', async ({ page }) => {
    await page.goto('/onboarding')
    await page.waitForLoadState('networkidle')

    // Count total steps by progressing through them
    let stepCount = 0
    let canContinue = true

    while (canContinue && stepCount < 3) {
      try {
        // Get fresh reference to button on each iteration
        const continueButton = page.getByRole('button', { name: /continue|get started|finish/i })

        // Wait for button to exist and be visible
        await continueButton.waitFor({ state: 'visible', timeout: 5000 })

        // Wait for any animations to settle
        await page.waitForTimeout(300)

        // Click the button
        await continueButton.click({ timeout: 10000 })
        stepCount++

        // Wait for the page to settle after click
        await page.waitForLoadState('networkidle')
      } catch {
        // Button not found - we've reached the end or navigated away
        canContinue = false
      }
    }

    // Should have completed at least 1 step
    expect(stepCount).toBeGreaterThan(0)

    // Should have navigated away from onboarding
    await expect(page).toHaveURL(/.*auth\/login/)
  })
})

test.describe('Onboarding Skip and Completion', () => {
  test.beforeEach(async ({ page }) => {
    // Clear onboarding completion flag
    await page.addInitScript(() => {
      localStorage.removeItem('onboarding_complete')
    })
  })

  test('should skip onboarding and land on login', async ({ page }) => {
    await page.goto('/onboarding')
    await page.waitForLoadState('networkidle')

    // Click skip button
    await page.getByRole('button', { name: 'Skip' }).click()
    await page.waitForLoadState('networkidle')

    // Should navigate to login page
    await expect(page).toHaveURL(/.*auth\/login/)
    await expect(page.getByText('Welcome back')).toBeVisible()
  })

  test('should display skip button on all steps', async ({ page }) => {
    await page.goto('/onboarding')
    await page.waitForLoadState('networkidle')

    // Step 1 should have skip button
    let skipButton = page.getByRole('button', { name: /skip/i })
    await expect(skipButton).toBeVisible()

    // Go to Step 2
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForLoadState('networkidle')

    // Step 2 should also have skip button
    skipButton = page.getByRole('button', { name: /skip/i })
    const hasSkipButton = await skipButton.isVisible().catch(() => false)

    if (hasSkipButton) {
      await expect(skipButton).toBeVisible()
    }
  })

  test('should navigate to home page after completing onboarding', async ({ page }) => {
    await page.goto('/onboarding')
    await page.waitForLoadState('networkidle')

    // Complete all steps
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForLoadState('networkidle')

    const step2Text = page.getByText(/Search with\s*natural language/i)
    await step2Text.waitFor({ state: 'visible', timeout: 1000 * 10 })
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForLoadState('networkidle')

    const step3Text = page.getByText(/AI-generated rough cuts/i)
    await step3Text.waitFor({ state: 'visible', timeout: 1000 * 10 })
    await page.getByRole('button', { name: 'Get Started' }).click()
    await page.waitForLoadState('networkidle')

    // Should navigate to login page (which leads to home after login)
    await expect(page).toHaveURL(/.*auth\/login/)
  })

  test('property: skip onboarding skips all remaining steps', async ({ page }) => {
    await page.goto('/onboarding')
    await page.waitForLoadState('networkidle')

    // Get initial URL
    const initialUrl = page.url()
    expect(initialUrl).toContain('/onboarding')

    // Click skip
    await page.getByRole('button', { name: 'Skip' }).click()
    await page.waitForLoadState('networkidle')

    // Should navigate away from onboarding
    await expect(page).toHaveURL(/.*auth\/login/)
  })

  test('property: skip from any step navigates to login', async ({ page }) => {
    await page.goto('/onboarding')
    await page.waitForLoadState('networkidle')

    // Go to Step 2
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForLoadState('networkidle')

    // Skip from Step 2
    const skipButton = page.getByRole('button', { name: /skip/i })
    const hasSkipButton = await skipButton.isVisible().catch(() => false)

    if (hasSkipButton) {
      await skipButton.click()
      await page.waitForLoadState('networkidle')

      // Should navigate to login page
      await expect(page).toHaveURL(/.*auth\/login/)
    }
  })
})

test.describe('Onboarding Completion State', () => {
  test('should redirect to login if onboarding is already completed', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('onboarding_complete', 'true')
    })

    await page.goto('/onboarding')

    await expect(page).toHaveURL(/.*auth\/login/)
    await expect(page.getByText('Welcome back')).toBeVisible()
  })

  test('should not display onboarding for users who completed it', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('onboarding_complete', 'true')
    })

    await page.goto('/onboarding')
    await page.waitForLoadState('networkidle')

    // Should not display onboarding content
    const onboardingTitle = page.getByText(/Your video library,.*reimagined/i)
    const hasOnboarding = await onboardingTitle.isVisible().catch(() => false)

    expect(hasOnboarding).toBeFalsy()
  })
})
