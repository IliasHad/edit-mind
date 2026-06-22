import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFetch = vi.fn()
const mockReadFile = vi.fn()
const mockWriteFile = vi.fn()

vi.mock('node-fetch', () => ({
  default: mockFetch,
}))

vi.mock('fs/promises', () => ({
  readFile: mockReadFile,
  writeFile: mockWriteFile,
}))

vi.mock('@shared/constants', () => ({
  CACHE_FILE: '/tmp/edit-mind-location-cache.json',
  CACHE_DURATION: 60_000,
}))

vi.mock('@shared/services/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  },
}))

describe('localized location lookup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReadFile.mockRejectedValue(new Error('cache missing'))
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        display_name: 'Moscow, Russia',
        address: {
          city: 'Москва',
          country: 'Россия',
        },
      }),
    })
  })

  it('uses requested locale in Nominatim request and cache key', async () => {
    const { getLocationName } = await import('@shared/utils/location')

    const name = await getLocationName('55.755800°N, 37.617300°E', 'ru')

    expect(name).toBe('Москва, Россия')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('accept-language=ru'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Accept-Language': 'ru',
        }),
      })
    )
    expect(mockWriteFile).toHaveBeenCalledWith(
      '/tmp/edit-mind-location-cache.json',
      expect.stringContaining('55.755800,37.617300:ru'),
      'utf-8'
    )
  })
})
