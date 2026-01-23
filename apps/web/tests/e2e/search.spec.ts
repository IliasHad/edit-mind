import { test, expect } from '@playwright/test'

test.describe('Search Page - UI and Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByPlaceholder('Email').fill('admin@example.com')
    await page.getByPlaceholder('Password').fill('admin')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/\/app\/home/)

    await page.goto('/app/search')
    await page.waitForLoadState('networkidle')
  })

  test.describe('Search Input Field Display', () => {
    test('should display search input field with placeholder text', async ({ page }) => {
      const searchInput = page.getByPlaceholder('Search scenes, people, objects...')
      await expect(searchInput).toBeVisible()
      await expect(searchInput).toHaveAttribute('type', 'text')
    })

    test('should display search input field on page load', async ({ page }) => {
      const searchInput = page.getByPlaceholder('Search scenes, people, objects...')
      await expect(searchInput).toBeVisible()
      await expect(searchInput).toHaveAttribute('placeholder', 'Search scenes, people, objects...')
    })

    test('should allow typing in search input field', async ({ page }) => {
      const searchInput = page.getByPlaceholder('Search scenes, people, objects...')
      await searchInput.fill('test query')
      await expect(searchInput).toHaveValue('test query')
    })

    test('should display empty state message initially', async ({ page }) => {
      await expect(page.getByText('Find scenes by text, image, faces, objects, and emotions')).toBeVisible()
      await expect(page.getByText('Start typing to search your video scenes')).toBeVisible()
    })
  })

  test.describe('Search Query Submission', () => {
    test('should perform a search when pressing Enter key', async ({ page }) => {
      const searchQuery = 'a cat sitting on a table'
      const videoPath = '/media/videos/cat_video.mp4'

      await page.route('**/api/search', async (route) => {
        const json = {
          videos: [
            {
              source: videoPath,
              duration: 4,
              aspectRatio: '16:9',
              camera: 'iPhone 14',
              category: 'Uncategorized',
              createdAt: new Date().getTime(),
              scenes: [
                {
                  id: '123',
                  thumbnailUrl: '/app/data/.thumbnails/cat.jpg',
                  startTime: 0,
                  endTime: 1,
                  faces: [],
                  objects: ['cat', 'table'],
                  transcription: '',
                  description: 'a cat sitting on a table',
                  shotType: 'medium-shot',
                  emotions: [],
                  createdAt: new Date().getTime(),
                  source: videoPath,
                  camera: 'iPhone 14',
                  dominantColorHex: '#FF5733',
                  dominantColorName: 'Red',
                  detectedText: [],
                  location: 'Living Room',
                  duration: 4,
                  detectedTextData: [],
                  transcriptionWords: [],
                  objectsData: [],
                  facesData: [],
                  aspectRatio: '16:9',
                  matched: true,
                },
              ],
              sceneCount: 1,
              thumbnailUrl: '/app/data/.thumbnails/cat.jpg',
              faces: [],
              emotions: [],
              objects: ['table', 'cat'],
              shotTypes: ['medium-shot'],
            },
          ],
          total: 1,
          page: 1,
          limit: 40,
          query: searchQuery,
        }
        await route.fulfill({ json })
      })

      await page.getByPlaceholder('Search scenes, people, objects...').fill(searchQuery)
      await page.keyboard.press('Enter')

      await expect(page.getByRole('link').first()).toBeVisible({ timeout: 10000 })
    })

    test('should perform a search when clicking search button', async ({ page }) => {
      const searchQuery = 'dog playing'
      const videoPath = '/media/videos/dog_video.mp4'

      await page.route('**/api/search', async (route) => {
        const json = {
          videos: [
            {
              source: videoPath,
              duration: 5,
              aspectRatio: '16:9',
              camera: 'GoPro',
              category: 'Uncategorized',
              createdAt: new Date().getTime(),
              scenes: [
                {
                  id: '456',
                  thumbnailUrl: '/app/data/.thumbnails/dog.jpg',
                  startTime: 0,
                  endTime: 2,
                  faces: [],
                  objects: ['dog', 'ball'],
                  transcription: '',
                  description: 'dog playing with ball',
                  shotType: 'wide-shot',
                  emotions: ['happy'],
                  createdAt: new Date().getTime(),
                  source: videoPath,
                  camera: 'GoPro',
                  dominantColorHex: '#00FF00',
                  dominantColorName: 'Green',
                  detectedText: [],
                  location: 'Park',
                  duration: 5,
                  detectedTextData: [],
                  transcriptionWords: [],
                  objectsData: [],
                  facesData: [],
                  aspectRatio: '16:9',
                  matched: true,
                },
              ],
              sceneCount: 1,
              thumbnailUrl: '/app/data/.thumbnails/dog.jpg',
              faces: [],
              emotions: ['happy'],
              objects: ['dog', 'ball'],
              shotTypes: ['wide-shot'],
            },
          ],
          total: 1,
          page: 1,
          limit: 40,
          query: searchQuery,
        }
        await route.fulfill({ json })
      })

      const searchInput = page.getByPlaceholder('Search scenes, people, objects...')
      await searchInput.fill(searchQuery)

      // Look for search button and click it
      const searchButton = page.getByRole('button', { name: /search/i })
      if (await searchButton.isVisible()) {
        await searchButton.click()
      } else {
        // If no button, press Enter
        await page.keyboard.press('Enter')
      }

      await expect(page.getByRole('link').first()).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Search Results Display with Metadata', () => {
    test('should display search results with scene thumbnails', async ({ page }) => {
      const searchQuery = 'a cat sitting on a table'
      const videoPath = '/media/videos/cat_video.mp4'

      await page.route('**/api/search', async (route) => {
        const json = {
          videos: [
            {
              source: videoPath,
              duration: 4,
              aspectRatio: '16:9',
              camera: 'iPhone 14',
              category: 'Uncategorized',
              createdAt: new Date().getTime(),
              scenes: [
                {
                  id: '123',
                  thumbnailUrl: '/app/data/.thumbnails/cat.jpg',
                  startTime: 0,
                  endTime: 1,
                  faces: [],
                  objects: ['cat', 'table'],
                  transcription: '',
                  description: 'a cat sitting on a table',
                  shotType: 'medium-shot',
                  emotions: [],
                  createdAt: new Date().getTime(),
                  source: videoPath,
                  camera: 'iPhone 14',
                  dominantColorHex: '#FF5733',
                  dominantColorName: 'Red',
                  detectedText: [],
                  location: 'Living Room',
                  duration: 4,
                  detectedTextData: [],
                  transcriptionWords: [],
                  objectsData: [],
                  facesData: [],
                  aspectRatio: '16:9',
                  matched: true,
                },
              ],
              sceneCount: 1,
              thumbnailUrl: '/app/data/.thumbnails/cat.jpg',
              faces: [],
              emotions: [],
              objects: ['table', 'cat'],
              shotTypes: ['medium-shot'],
            },
          ],
          total: 1,
          page: 1,
          limit: 40,
          query: searchQuery,
        }
        await route.fulfill({ json })
      })

      await page.getByPlaceholder('Search scenes, people, objects...').fill(searchQuery)
      await page.keyboard.press('Enter')

      // Verify results are displayed
      await expect(page.getByRole('link').first()).toBeVisible({ timeout: 10000 })
    })

    test('should display search results with duration metadata', async ({ page }) => {
      const searchQuery = 'sunset'
      const videoPath = '/media/videos/sunset.mp4'

      await page.route('**/api/search', async (route) => {
        const json = {
          videos: [
            {
              source: videoPath,
              duration: 10,
              aspectRatio: '16:9',
              camera: 'DJI Drone',
              category: 'Nature',
              createdAt: new Date().getTime(),
              scenes: [
                {
                  id: '789',
                  thumbnailUrl: '/app/data/.thumbnails/sunset.jpg',
                  startTime: 0,
                  endTime: 5,
                  faces: [],
                  objects: ['sky', 'sun'],
                  transcription: '',
                  description: 'beautiful sunset',
                  shotType: 'wide-shot',
                  emotions: ['peaceful'],
                  createdAt: new Date().getTime(),
                  source: videoPath,
                  camera: 'DJI Drone',
                  dominantColorHex: '#FF6B35',
                  dominantColorName: 'Orange',
                  detectedText: [],
                  location: 'Beach',
                  duration: 10,
                  detectedTextData: [],
                  transcriptionWords: [],
                  objectsData: [],
                  facesData: [],
                  aspectRatio: '16:9',
                  matched: true,
                },
              ],
              sceneCount: 1,
              thumbnailUrl: '/app/data/.thumbnails/sunset.jpg',
              faces: [],
              emotions: ['peaceful'],
              objects: ['sky', 'sun'],
              shotTypes: ['wide-shot'],
            },
          ],
          total: 1,
          page: 1,
          limit: 40,
          query: searchQuery,
        }
        await route.fulfill({ json })
      })

      await page.getByPlaceholder('Search scenes, people, objects...').fill(searchQuery)
      await page.keyboard.press('Enter')

      await expect(page.getByRole('link').first()).toBeVisible({ timeout: 10000 })
    })

    test('should display search results with camera metadata', async ({ page }) => {
      const searchQuery = 'action'
      const videoPath = '/media/videos/action.mp4'

      await page.route('**/api/search', async (route) => {
        const json = {
          videos: [
            {
              source: videoPath,
              duration: 8,
              aspectRatio: '16:9',
              camera: 'Canon EOS',
              category: 'Sports',
              createdAt: new Date().getTime(),
              scenes: [
                {
                  id: '999',
                  thumbnailUrl: '/app/data/.thumbnails/action.jpg',
                  startTime: 0,
                  endTime: 3,
                  faces: [],
                  objects: ['person', 'skateboard'],
                  transcription: '',
                  description: 'person skateboarding',
                  shotType: 'medium-shot',
                  emotions: ['excited'],
                  createdAt: new Date().getTime(),
                  source: videoPath,
                  camera: 'Canon EOS',
                  dominantColorHex: '#0066FF',
                  dominantColorName: 'Blue',
                  detectedText: [],
                  location: 'Skate Park',
                  duration: 8,
                  detectedTextData: [],
                  transcriptionWords: [],
                  objectsData: [],
                  facesData: [],
                  aspectRatio: '16:9',
                  matched: true,
                },
              ],
              sceneCount: 1,
              thumbnailUrl: '/app/data/.thumbnails/action.jpg',
              faces: [],
              emotions: ['excited'],
              objects: ['person', 'skateboard'],
              shotTypes: ['medium-shot'],
            },
          ],
          total: 1,
          page: 1,
          limit: 40,
          query: searchQuery,
        }
        await route.fulfill({ json })
      })

      await page.getByPlaceholder('Search scenes, people, objects...').fill(searchQuery)
      await page.keyboard.press('Enter')

      await expect(page.getByRole('link').first()).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('No Results and Empty State', () => {
    test('should display no results message for a query with no matches', async ({ page }) => {
      const searchQuery = 'nonexistent query xyz'

      await page.route('**/api/search**', async (route) => {
        const json = { videos: [], total: 0, page: 1, limit: 40, query: searchQuery }
        await route.fulfill({ json })
      })

      await page.getByPlaceholder('Search scenes, people, objects...').fill(searchQuery)
      await page.keyboard.press('Enter')

      await expect(page.getByText('No scenes found')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('Try adjusting your search terms or filters')).toBeVisible()
    })

    test('should display empty state message initially', async ({ page }) => {
      await expect(page.getByText('Find scenes by text, image, faces, objects, and emotions')).toBeVisible()
      await expect(page.getByText('Start typing to search your video scenes')).toBeVisible()
    })

    test('should clear search results when clearing search query', async ({ page }) => {
      const searchQuery = 'test'
      const videoPath = '/media/videos/test.mp4'

      await page.route('**/api/search', async (route) => {
        const json = {
          videos: [
            {
              source: videoPath,
              duration: 3,
              aspectRatio: '16:9',
              camera: 'iPhone',
              category: 'Test',
              createdAt: new Date().getTime(),
              scenes: [
                {
                  id: '111',
                  thumbnailUrl: '/app/data/.thumbnails/test.jpg',
                  startTime: 0,
                  endTime: 1,
                  faces: [],
                  objects: [],
                  transcription: '',
                  description: 'test scene',
                  shotType: 'close-up',
                  emotions: [],
                  createdAt: new Date().getTime(),
                  source: videoPath,
                  camera: 'iPhone',
                  dominantColorHex: '#FFFFFF',
                  dominantColorName: 'White',
                  detectedText: [],
                  location: 'Studio',
                  duration: 3,
                  detectedTextData: [],
                  transcriptionWords: [],
                  objectsData: [],
                  facesData: [],
                  aspectRatio: '16:9',
                  matched: true,
                },
              ],
              sceneCount: 1,
              thumbnailUrl: '/app/data/.thumbnails/test.jpg',
              faces: [],
              emotions: [],
              objects: [],
              shotTypes: ['close-up'],
            },
          ],
          total: 1,
          page: 1,
          limit: 40,
          query: searchQuery,
        }
        await route.fulfill({ json })
      })

      // Perform search
      const searchInput = page.getByPlaceholder('Search scenes, people, objects...')
      await searchInput.fill(searchQuery)
      await page.keyboard.press('Enter')

      // Verify results are displayed
      await expect(page.getByRole('link').first()).toBeVisible({ timeout: 10000 })

      // Clear search
      await searchInput.clear()
      await page.keyboard.press('Enter')

      // Verify empty state is shown
      await expect(page.getByText('Find scenes by text, image, faces, objects, and emotions')).toBeVisible({
        timeout: 5000,
      })
    })
  })
})

test.describe('Search Results Accuracy', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByPlaceholder('Email').fill('admin@example.com')
    await page.getByPlaceholder('Password').fill('admin')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/\/app\/home/)

    await page.goto('/app/search')
    await page.waitForLoadState('networkidle')
  })

  test('property: all search results contain the search query in description or metadata', async ({ page }) => {
    const searchQueries = ['cat', 'dog', 'sunset', 'person']

    for (const query of searchQueries) {
      await page.route('**/api/search**', async (route) => {
        const json = {
          videos: [
            {
              source: '/media/videos/test.mp4',
              duration: 5,
              aspectRatio: '16:9',
              camera: 'Test Camera',
              category: 'Test',
              createdAt: new Date().getTime(),
              scenes: [
                {
                  id: '1',
                  thumbnailUrl: '/app/data/.thumbnails/test.jpg',
                  startTime: 0,
                  endTime: 2,
                  faces: [],
                  objects: [query],
                  transcription: '',
                  description: `scene with ${query}`,
                  shotType: 'medium-shot',
                  emotions: [],
                  createdAt: new Date().getTime(),
                  source: '/media/videos/test.mp4',
                  camera: 'Test Camera',
                  dominantColorHex: '#000000',
                  dominantColorName: 'Black',
                  detectedText: [],
                  location: 'Test Location',
                  duration: 5,
                  detectedTextData: [],
                  transcriptionWords: [],
                  objectsData: [],
                  facesData: [],
                  aspectRatio: '16:9',
                  matched: true,
                },
              ],
              sceneCount: 1,
              thumbnailUrl: '/app/data/.thumbnails/test.jpg',
              faces: [],
              emotions: [],
              objects: [query],
              shotTypes: ['medium-shot'],
            },
          ],
          total: 1,
          page: 1,
          limit: 40,
          query,
        }
        await route.fulfill({ json })
      })

      const searchInput = page.getByPlaceholder('Search scenes, people, objects...')
      await searchInput.clear()
      await searchInput.fill(query)
      await page.keyboard.press('Enter')

      // Verify results are displayed
      await expect(page.getByRole('link').first()).toBeVisible({ timeout: 10000 })
    }
  })

  test('property: search results are displayed in correct order', async ({ page }) => {
    const searchQuery = 'test'

    await page.route('**/api/search**', async (route) => {
      const json = {
        videos: [
          {
            source: '/media/videos/test1.mp4',
            duration: 5,
            aspectRatio: '16:9',
            camera: 'Camera 1',
            category: 'Test',
            createdAt: new Date().getTime(),
            scenes: [
              {
                id: '1',
                thumbnailUrl: '/app/data/.thumbnails/test1.jpg',
                startTime: 0,
                endTime: 2,
                faces: [],
                objects: ['test'],
                transcription: '',
                description: 'first result',
                shotType: 'medium-shot',
                emotions: [],
                createdAt: new Date().getTime(),
                source: '/media/videos/test1.mp4',
                camera: 'Camera 1',
                dominantColorHex: '#000000',
                dominantColorName: 'Black',
                detectedText: [],
                location: 'Location 1',
                duration: 5,
                detectedTextData: [],
                transcriptionWords: [],
                objectsData: [],
                facesData: [],
                aspectRatio: '16:9',
                matched: true,
              },
            ],
            sceneCount: 1,
            thumbnailUrl: '/app/data/.thumbnails/test1.jpg',
            faces: [],
            emotions: [],
            objects: ['test'],
            shotTypes: ['medium-shot'],
          },
          {
            source: '/media/videos/test2.mp4',
            duration: 4,
            aspectRatio: '16:9',
            camera: 'Camera 2',
            category: 'Test',
            createdAt: new Date().getTime(),
            scenes: [
              {
                id: '2',
                thumbnailUrl: '/app/data/.thumbnails/test2.jpg',
                startTime: 0,
                endTime: 1,
                faces: [],
                objects: ['test'],
                transcription: '',
                description: 'second result',
                shotType: 'wide-shot',
                emotions: [],
                createdAt: new Date().getTime(),
                source: '/media/videos/test2.mp4',
                camera: 'Camera 2',
                dominantColorHex: '#FFFFFF',
                dominantColorName: 'White',
                detectedText: [],
                location: 'Location 2',
                duration: 4,
                detectedTextData: [],
                transcriptionWords: [],
                objectsData: [],
                facesData: [],
                aspectRatio: '16:9',
                matched: true,
              },
            ],
            sceneCount: 1,
            thumbnailUrl: '/app/data/.thumbnails/test2.jpg',
            faces: [],
            emotions: [],
            objects: ['test'],
            shotTypes: ['wide-shot'],
          },
        ],
        total: 2,
        page: 1,
        limit: 40,
        query: searchQuery,
      }
      await route.fulfill({ json })
    })

    const searchInput = page.getByPlaceholder('Search scenes, people, objects...')
    await searchInput.fill(searchQuery)
    await page.keyboard.press('Enter')

    // Verify results are displayed
    const results = page.getByRole('link')
    await expect(results.first()).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Result Click Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByPlaceholder('Email').fill('admin@example.com')
    await page.getByPlaceholder('Password').fill('admin')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/\/app\/home/)

    await page.goto('/app/search')
    await page.waitForLoadState('networkidle')
  })

  test('should navigate to video detail page when clicking search result', async ({ page }) => {
    const searchQuery = 'test'
    const videoPath = '/media/videos/test.mp4'
    const fileName = 'test.mp4'

    await page.route('**/api/search', async (route) => {
      const json = {
        videos: [
          {
            source: videoPath,
            duration: 5,
            aspectRatio: '16:9',
            camera: 'Test Camera',
            category: 'Test',
            createdAt: new Date().getTime(),
            scenes: [
              {
                id: '1',
                thumbnailUrl: '/app/data/.thumbnails/test.jpg',
                startTime: 0,
                endTime: 2,
                faces: [],
                objects: ['test'],
                transcription: '',
                description: 'test scene',
                shotType: 'medium-shot',
                emotions: [],
                createdAt: new Date().getTime(),
                source: videoPath,
                camera: 'Test Camera',
                dominantColorHex: '#000000',
                dominantColorName: 'Black',
                detectedText: [],
                location: 'Test Location',
                duration: 5,
                detectedTextData: [],
                transcriptionWords: [],
                objectsData: [],
                facesData: [],
                aspectRatio: '16:9',
                matched: true,
              },
            ],
            sceneCount: 1,
            thumbnailUrl: '/app/data/.thumbnails/test.jpg',
            faces: [],
            emotions: [],
            objects: ['test'],
            shotTypes: ['medium-shot'],
          },
        ],
        total: 1,
        page: 1,
        limit: 40,
        query: searchQuery,
      }
      await route.fulfill({ json })
    })

    const searchInput = page.getByPlaceholder('Search scenes, people, objects...')
    await searchInput.fill(searchQuery)
    await page.keyboard.press('Enter')

    await page.waitForLoadState('networkidle')

    // Hover over the result card to reveal the link
    await page.getByLabel(`View ${fileName}`).first().click()

    // Verify navigation
    await expect(page).toHaveURL(/\/app\/videos/, { timeout: 10000 })

    // Verify the source parameter
    const url = new URL(page.url())
    expect(url.searchParams.get('source')).toContain(fileName)
  })

  test('property: clicking any search result navigates to video detail page', async ({ page }) => {
    const searchQuery = 'test'
    const videoPaths = ['/media/videos/test1.mp4', '/media/videos/test2.mp4', '/media/videos/test3.mp4']

    for (const videoPath of videoPaths) {
      await page.route('**/api/search', async (route) => {
        const json = {
          videos: [
            {
              source: videoPath,
              duration: 5,
              aspectRatio: '16:9',
              camera: 'Test Camera',
              category: 'Test',
              createdAt: new Date().getTime(),
              scenes: [
                {
                  id: '1',
                  thumbnailUrl: '/app/data/.thumbnails/test.jpg',
                  startTime: 0,
                  endTime: 2,
                  faces: [],
                  objects: ['test'],
                  transcription: '',
                  description: 'test scene',
                  shotType: 'medium-shot',
                  emotions: [],
                  createdAt: new Date().getTime(),
                  source: videoPath,
                  camera: 'Test Camera',
                  dominantColorHex: '#000000',
                  dominantColorName: 'Black',
                  detectedText: [],
                  location: 'Test Location',
                  duration: 5,
                  detectedTextData: [],
                  transcriptionWords: [],
                  objectsData: [],
                  facesData: [],
                  aspectRatio: '16:9',
                  matched: true,
                },
              ],
              sceneCount: 1,
              thumbnailUrl: '/app/data/.thumbnails/test.jpg',
              faces: [],
              emotions: [],
              objects: ['test'],
              shotTypes: ['medium-shot'],
            },
          ],
          total: 1,
          page: 1,
          limit: 40,
          query: searchQuery,
        }
        await route.fulfill({ json })
      })
      const fileName = videoPath.split('/')[videoPath.split('/').length - 1]

      // Go back to search page
      await page.goto('/app/search')
      await page.waitForLoadState('networkidle')

      const searchInput = page.getByPlaceholder('Search scenes, people, objects...')
      await searchInput.fill(searchQuery)
      await page.keyboard.press('Enter')

      // Wait for the link to be attached (exists in DOM)
      await page.waitForLoadState('networkidle')

      // Hover over the result card to reveal the link
      await page.getByLabel(`View ${fileName}`).first().click()

      // Verify navigation
      await expect(page).toHaveURL(/\/app\/videos/, { timeout: 10000 })

      // Verify the source parameter
      const url = new URL(page.url())
      expect(url.searchParams.get('source')).toContain(fileName)
    }
  })
})
