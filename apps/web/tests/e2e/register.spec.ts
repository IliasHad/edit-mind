import { test, expect } from '@playwright/test'

test.describe('Authentication Pages - Register', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/auth/register')
    })

    test.describe('UI', () => {
        test('should display register form with all elements', async ({ page }) => {
            await expect(page.getByLabel('Name')).toBeVisible()
            await expect(page.getByLabel('Email')).toBeVisible()
            await expect(page.getByLabel('Password').first()).toBeVisible()
            await expect(page.getByLabel('Confirmation Password')).toBeVisible()
            await expect(page.getByRole('button', { name: /sign up/i })).toBeVisible()
        })

        test('should have correct page title', async ({ page }) => {
            await expect(page).toHaveTitle('Register | Edit Mind')
        })
    })

    test.describe('Form Validation', () => {
        test('should show error for empty form submission', async ({ page }) => {
            await page.getByRole('button', { name: /sign up/i }).click()
            await expect(page.getByText(/invalid form data/i)).toBeVisible()
        })

        test('should show error for invalid email format', async ({ page }) => {
            const emailInput = page.getByLabel('Email')
            await emailInput.fill('invalid-email')
            await page.getByLabel('Password').first().fill('password123')
            await page.getByLabel('Confirmation Password').fill('password123')
            await page.getByLabel('Name').fill('John Doe')
            await page.getByRole('button', { name: /sign up/i }).click()

            await expect(emailInput).toHaveAttribute('type', 'email')

            const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid)
            expect(isInvalid).toBe(true)

            const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage)
            expect(validationMessage).toBeTruthy()
            expect(validationMessage.toLowerCase()).toContain('email')
        })

        test('should show error for missing email', async ({ page }) => {
            await page.getByLabel('Name').fill('John Doe')
            await page.getByLabel('Password').first().fill('password123')
            await page.getByLabel('Confirmation Password').fill('password123')
            await page.getByRole('button', { name: /sign up/i }).click()

            await expect(page.getByText(/invalid form data/i)).toBeVisible()
        })

        test('should show error for missing password', async ({ page }) => {
            await page.getByLabel('Name').fill('John Doe')
            await page.getByLabel('Email').fill('test@example.com')
            await page.getByRole('button', { name: /sign up/i }).click()

            await expect(page.getByText(/invalid form data/i)).toBeVisible()
        })

        test('should show error for password too short', async ({ page }) => {
            await page.getByLabel('Name').fill('John Doe')
            await page.getByLabel('Email').fill('test@example.com')
            await page.getByLabel('Password').first().fill('123')
            await page.getByLabel('Confirmation Password').fill('123')
            await page.getByRole('button', { name: /sign up/i }).click()

            await expect(page.getByText(/invalid form data/i)).toBeVisible()
        })

        test('should show error for name too short', async ({ page }) => {
            await page.getByLabel('Name').fill('J')
            await page.getByLabel('Email').fill('test@example.com')
            await page.getByLabel('Password').first().fill('password123')
            await page.getByLabel('Confirmation Password').fill('password123')
            await page.getByRole('button', { name: /sign up/i }).click()

            await expect(page.getByText(/invalid form data/i)).toBeVisible()
        })

        test('should show error when passwords do not match', async ({ page }) => {
            await page.getByLabel('Name').fill('John Doe')
            await page.getByLabel('Email').fill('test@example.com')
            await page.getByLabel('Password').first().fill('password123')
            await page.getByLabel('Confirmation Password').fill('differentpassword')
            await page.getByRole('button', { name: /sign up/i }).click()

            await expect(page.getByText(/passwords do not match/i)).toBeVisible()
        })
    })

    test.describe('Successful Register', () => {
        test('should successfully register with valid data', async ({ page }) => {
            await page.getByLabel('Name').fill('John Doe')
            await page.getByLabel('Email').fill(`john_${Date.now()}@example.com`)
            await page.getByLabel('Password').first().fill('password123')
            await page.getByLabel('Confirmation Password').fill('password123')
            await page.getByRole('button', { name: /sign up/i }).click()

            await page.waitForLoadState('networkidle')

            await expect(page).toHaveURL(/\/app\/home/, { timeout: 5000 })
        })
    })

    test.describe('Failed Register', () => {
        test('should show error for already existing email', async ({ page }) => {
            await page.getByLabel('Name').fill('John Doe')
            await page.getByLabel('Email').fill('admin@example.com')
            await page.getByLabel('Password').first().fill('password123')
            await page.getByLabel('Confirmation Password').fill('password123')
            await page.getByRole('button', { name: /sign up/i }).click()

            await expect(page.getByText(/already exists/i)).toBeVisible()
        })
    })

    test.describe('Form Behavior', () => {
        test('should clear error message on new input', async ({ page }) => {
            await page.getByRole('button', { name: /sign up/i }).click()
            await expect(page.getByText(/invalid form data/i)).toBeVisible()

            await page.getByLabel('Name').fill('John Doe')

            await expect(page.getByText(/invalid email/i)).toBeVisible()
        })

        test('should allow form submission with Enter key', async ({ page }) => {
            await page.getByLabel('Name').fill('John Doe')
            await page.getByLabel('Email').fill(`john_${Date.now()}@example.com`)
            await page.getByLabel('Password').first().fill('password123')
            await page.getByLabel('Confirmation Password').fill('password123')
            await page.getByLabel('Confirmation Password').press('Enter')

            await page.waitForLoadState('networkidle')

            await expect(page).toHaveURL(/\/app\/home/, { timeout: 5000 })
        })
    })

    test.describe('Accessibility', () => {
        test('should have proper form labels and ARIA attributes', async ({ page }) => {
            await expect(page.getByLabel('Email')).toHaveAttribute('type', 'email')
            await expect(page.getByLabel('Password').first()).toHaveAttribute('type', 'password')
            await expect(page.getByLabel('Confirmation Password')).toHaveAttribute('type', 'password')
        })
    })

    test.describe('Security', () => {
        test('should mask password inputs', async ({ page }) => {
            await expect(page.getByLabel('Password').first()).toHaveAttribute('type', 'password')
            await expect(page.getByLabel('Confirmation Password')).toHaveAttribute('type', 'password')
        })

        test('should not expose password in URL or network logs', async ({ page }) => {
            await page.getByLabel('Name').fill('John Doe')
            await page.getByLabel('Email').fill('test@example.com')
            await page.getByLabel('Password').first().fill('secretpassword')
            await page.getByLabel('Confirmation Password').fill('secretpassword')
            await page.getByRole('button', { name: /sign up/i }).click()

            const url = page.url()
            expect(url).not.toContain('secretpassword')
        })
    })
})