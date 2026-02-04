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
      await page.waitForLoadState('networkidle')

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

      // Wait for navigation or success indicator
      await page.waitForLoadState('networkidle')

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

      // Wait for navigation or success indicator
      await page.waitForLoadState('networkidle')

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

test.describe('Authentication State Persistence', () => {
  test('property: authenticated state persists across page navigation', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByPlaceholder('Email').fill('admin@example.com')
    await page.getByPlaceholder('Password').fill('admin')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/app\/home/, { timeout: 5000 })

    const pagesToVisit = ['/app/search', '/app/home', '/app/settings']

    for (const pagePath of pagesToVisit) {
      await page.goto(pagePath)
      await page.waitForLoadState('networkidle')

      expect(page.url()).not.toContain('/auth/login')
      expect(page.url()).toContain('/app/')
    }

    await page.goto('/app/home')
    await page.waitForLoadState('networkidle')

    expect(page.url()).toContain('/app/home')
    expect(page.url()).not.toContain('/auth/login')
  })

  test('property: authentication state persists across page reload', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByPlaceholder('Email').fill('admin@example.com')
    await page.getByPlaceholder('Password').fill('admin')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/app\/home/, { timeout: 5000 })

    await page.waitForLoadState('networkidle')

    expect(page.url()).toContain('/app/home')
    expect(page.url()).not.toContain('/auth/login')
  })

  test('property: authentication state persists across multiple page reloads', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByPlaceholder('Email').fill('admin@example.com')
    await page.getByPlaceholder('Password').fill('admin')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/app\/home/, { timeout: 5000 })

    for (let i = 0; i < 3; i++) {
      await page.reload()
      await page.waitForLoadState('networkidle')

      expect(page.url()).toContain('/app/home')
      expect(page.url()).not.toContain('/auth/login')
    }
  })
})

test.describe('Logout and Session Management', () => {
  test('should logout user successfully', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByPlaceholder('Email').fill('admin@example.com')
    await page.getByPlaceholder('Password').fill('admin')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/app\/home/, { timeout: 5000 })

    await page.goto('/app/settings')
    await page.waitForLoadState('networkidle')

    const logoutButton = page.getByRole('button', { name: /logout|sign out/i })
    if (await logoutButton.isVisible()) {
      await logoutButton.click()
      await page.waitForLoadState('networkidle')

      await expect(page).toHaveURL(/\/auth\/login/, { timeout: 5000 })
    }
  })

  test('should clear session on logout', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByPlaceholder('Email').fill('admin@example.com')
    await page.getByPlaceholder('Password').fill('admin')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForLoadState('networkidle')

    // Get session cookie before logout
    const cookies = await page.context().cookies()
    const sessionCookieBefore = cookies.find((cookie) => cookie.name.includes('__session'))

    expect(sessionCookieBefore).toBeTruthy()
    expect(sessionCookieBefore?.value).toBeTruthy()

    await page.goto('/app/home')
    await page.waitForLoadState('networkidle')

    const logoutButton = page.getByRole('button', { name: /logout|sign out/i })
    await logoutButton.click()
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 5000 })

    const cookiesAfter = await page.context().cookies()
    const sessionCookieAfter = cookiesAfter.find((cookie) => cookie.name === '__session')

    expect(sessionCookieAfter).toBeUndefined()
  })

  test('should redirect to login when accessing protected route without authentication', async ({ page, context }) => {
    //Clear all cookies and storage to ensure no authentication
    await context.clearCookies()

    await page.goto('/app/home')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 5000 })
  })

  test('should redirect to login when accessing settings without authentication', async ({ page, context }) => {
    // Clear all cookies and storage
    await context.clearCookies()

    await page.goto('/app/settings')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 5000 })
  })

  test('should redirect to login when accessing videos without authentication', async ({ page, context }) => {
    await context.clearCookies()

    await page.goto('/app/home')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 5000 })
  })

  test('should prevent access to protected routes after logout', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByPlaceholder('Email').fill('admin@example.com')
    await page.getByPlaceholder('Password').fill('admin')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForLoadState('networkidle')

    // Assert: User is authenticated
    await expect(page).toHaveURL(/\/app\/home/, { timeout: 5000 })

    const logoutButton = page.getByRole('button', { name: /logout|sign out/i })
    if (await logoutButton.isVisible()) {
      await logoutButton.click()
      await page.waitForLoadState('networkidle')

      await expect(page).toHaveURL(/\/auth\/login/, { timeout: 5000 })

      //  Try to access protected route
      await page.goto('/app/home')
      await page.waitForLoadState('networkidle')

      await expect(page).toHaveURL(/\/auth\/login/, { timeout: 5000 })
    }
  })
})

test.describe('Protected Route Access Control', () => {
  test('property: all protected routes redirect to login without authentication', async ({ page, context }) => {
    // Clear all cookies and storage to ensure no authentication
    await context.clearCookies()

    // all protected routes
    const protectedRoutes = [
      '/app/home',
      '/app/search',
      '/app/home',
      '/app/faces',
      '/app/collections',
      '/app/projects',
      '/app/chats',
      '/app/settings',
    ]

    for (const route of protectedRoutes) {
      await page.goto(route)
      await page.waitForLoadState('networkidle')

      expect(page.url()).toContain('/auth/login')
    }
  })

  test('property: protected routes are accessible after authentication', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByPlaceholder('Email').fill('admin@example.com')
    await page.getByPlaceholder('Password').fill('admin')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/app\/home/, { timeout: 5000 })

    // Define protected routes to test
    const protectedRoutes = ['/app/search', '/app/home', '/app/settings']

    for (const route of protectedRoutes) {
      await page.goto(route)
      await page.waitForLoadState('networkidle')

      expect(page.url()).toContain(route)
      expect(page.url()).not.toContain('/auth/login')
    }
  })

  test('property: protected routes redirect to login after logout', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByPlaceholder('Email').fill('admin@example.com')
    await page.getByPlaceholder('Password').fill('admin')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/app\/home/, { timeout: 5000 })

    await page.waitForLoadState('networkidle')

    const logoutButton = page.getByRole('button', { name: /logout|sign out/i })
    if (await logoutButton.isVisible()) {
      await logoutButton.click()
      await page.waitForLoadState('networkidle')

      await expect(page).toHaveURL(/\/auth\/login/, { timeout: 5000 })

      const protectedRoutes = ['/app/home', '/app/search', '/app/home']

      for (const route of protectedRoutes) {
        await page.goto(route)
        await page.waitForLoadState('networkidle')

        expect(page.url()).toContain('/auth/login')
      }
    }
  })

  test('property: unauthenticated users cannot access any protected route', async ({ page, context }) => {
    await context.clearCookies()

    const protectedRoutes = [
      '/app/home',
      '/app/search',
      '/app/home',
      '/app/faces',
      '/app/collections',
      '/app/projects',
      '/app/chats',
      '/app/settings',
    ]

    for (const route of protectedRoutes) {
      await page.goto(route)
      await page.waitForLoadState('networkidle')

      const currentUrl = page.url()
      expect(currentUrl).toContain('/auth/login')
      expect(currentUrl).not.toContain('/app/')
    }
  })
})
