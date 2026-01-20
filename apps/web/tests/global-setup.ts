import { chromium, firefox, FullConfig, webkit } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use

  // Ensure baseURL is defined
  if (!baseURL) {
    throw new Error('baseURL is not defined in Playwright configuration.')
  }

  // Create auth state for ALL browser types
  const browserTypes = [
    { type: chromium, name: 'chromium' },
    { type: firefox, name: 'firefox' },
    { type: webkit, name: 'webkit' },
  ]

  for (const { type: browserType, name } of browserTypes) {
    const browser = await browserType.launch()
    const context = await browser.newContext()
    const page = await context.newPage()

    try {
      // 1. Navigate to the login page
      await page.goto(`${baseURL}/auth/login`)

      // 2. Fill in the login form
      await page.fill('input[name="email"]', 'admin@example.com')
      await page.fill('input[name="password"]', 'admin')

      // 3. Click the login button and wait for navigation
      await page.click('button:has-text("Sign In")')

      // 4. Save the storage state
      await context.storageState({ path: `playwright-auth-${name}.json` })
    } catch (error) {
      console.error(`Auth setup failed for ${name}:`, error)
      throw error
    } finally {
      await browser.close()
    }
  }
}

export default globalSetup
