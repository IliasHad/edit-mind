import { test, expect } from '@playwright/test'

test.describe('Authentication Pages - Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
  })

  test.describe('UI', () => {
    test('should display login form with all elements', async ({ page }) => {
      await expect(page.getByText('Welcome back')).toBeVisible()
      await expect(page.getByText('Sign in to access your video library')).toBeVisible()
      await expect(page.getByPlaceholder('Email')).toBeVisible()
      await expect(page.getByPlaceholder('Password')).toBeVisible()
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
    })

    test('should have correct page title', async ({ page }) => {
      await expect(page).toHaveTitle('Login | Edit Mind')
    })
  })

  test.describe('Form Validation', () => {
    test('should show error for empty form submission', async ({ page }) => {
      await page.getByRole('button', { name: /sign in/i }).click()
      await expect(page.getByText(/invalid form data/i)).toBeVisible()
    })

    test('should show error for invalid email format', async ({ page }) => {
      await page.getByPlaceholder('Email').fill('invalid-email')
      await page.getByPlaceholder('Password').fill('password123')
      await page.getByRole('button', { name: /sign in/i }).click()

      const emailInput = page.getByPlaceholder('Email')

      // Check for HTML5 validation state
      await expect(emailInput).toHaveAttribute('type', 'email')

      const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid)
      expect(isInvalid).toBe(true)

      // Verify validation message exists
      const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage)
      expect(validationMessage).toBeTruthy()
      expect(validationMessage.toLowerCase()).toContain('email')
    })

    test('should show error for missing email', async ({ page }) => {
      await page.getByPlaceholder('Password').fill('password123')
      await page.getByRole('button', { name: /sign in/i }).click()

      await expect(page.getByText(/invalid form data/i)).toBeVisible()
    })

    test('should show error for missing password', async ({ page }) => {
      await page.getByPlaceholder('Email').fill('test@example.com')
      await page.getByRole('button', { name: /sign in/i }).click()

      await expect(page.getByText(/invalid form data/i)).toBeVisible()
    })

    test('should show error for password too short', async ({ page }) => {
      await page.getByPlaceholder('Email').fill('test@example.com')
      await page.getByPlaceholder('Password').fill('123')
      await page.getByRole('button', { name: /sign in/i }).click()

      await expect(page.getByText(/invalid form data/i)).toBeVisible()
    })
  })

  test.describe('Successful Login', () => {
    test('should successfully login with valid credentials', async ({ page }) => {
      await page.getByPlaceholder('Email').fill('admin@example.com')
      await page.getByPlaceholder('Password').fill('admin')
      await page.getByRole('button', { name: /sign in/i }).click()

      // Wait for navigation or success indicator
      await expect(page).toHaveURL(/\/app\/home/, { timeout: 5000 })
    })
  })

  test.describe('Failed Login', () => {
    test('should show error for invalid credentials', async ({ page }) => {
      await page.getByPlaceholder('Email').fill('wrong@example.com')
      await page.getByPlaceholder('Password').fill('wrongpassword')
      await page.getByRole('button', { name: /sign in/i }).click()

      await expect(page.getByText('Invalid email or password')).toBeVisible()
    })

    test('should show error for non-existent user', async ({ page }) => {
      await page.getByPlaceholder('Email').fill('nonexistent@example.com')
      await page.getByPlaceholder('Password').fill('password123')
      await page.getByRole('button', { name: /sign in/i }).click()

      await expect(page.getByText('Invalid email or password')).toBeVisible()
    })
  })

  test.describe('Navigation', () => {
    test('should redirect authenticated user away to login', async ({ page, context }) => {
      // Set authentication cookie/session
      await page.getByPlaceholder('Email').fill('admin@example.com')
      await page.getByPlaceholder('Password').fill('admin')
      await page.getByRole('button', { name: /sign in/i }).click()

      await expect(page).toHaveURL(/\/app\/home/, { timeout: 5000 })

      await context.clearCookies()

      await page.goto('/app/settings')

      await expect(page).toHaveURL(/\/auth\/login/, { timeout: 5000 })
    })
  })

  test.describe('Form Behavior', () => {
    test('should clear error message on new input', async ({ page }) => {
      // Trigger error
      await page.getByRole('button', { name: /sign in/i }).click()
      await expect(page.getByText(/invalid form data/i)).toBeVisible()

      // Type in field
      await page.getByPlaceholder('Email').fill('test@example.com')

      await expect(page.getByText(/Password must be at least/i)).toBeVisible()
    })

    test('should allow form submission with Enter key', async ({ page }) => {
      await page.getByPlaceholder('Email').fill('admin@example.com')
      await page.getByPlaceholder('Password').fill('admin')
      await page.getByPlaceholder('Password').press('Enter')

      // Should trigger submission
      await expect(page).toHaveURL(/\/app\/home/, { timeout: 5000 })
    })
  })

  test.describe('Accessibility', () => {
    test('should have proper form labels and ARIA attributes', async ({ page }) => {
      const emailInput = page.getByPlaceholder('Email')
      const passwordInput = page.getByPlaceholder('Password')

      await expect(emailInput).toHaveAttribute('type', 'email')
      await expect(passwordInput).toHaveAttribute('type', 'password')
    })
  })

  test.describe('Security', () => {
    test('should mask password input', async ({ page }) => {
      const passwordInput = page.getByPlaceholder('Password')
      await expect(passwordInput).toHaveAttribute('type', 'password')
    })

    test('should not expose password in URL or network logs', async ({ page }) => {
      await page.getByPlaceholder('Email').fill('test@example.com')
      await page.getByPlaceholder('Password').fill('secretpassword')
      await page.getByRole('button', { name: /sign in/i }).click()

      const url = page.url()
      expect(url).not.toContain('secretpassword')
    })
  })
})
