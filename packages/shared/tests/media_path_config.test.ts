import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import path from 'path'

// Mock the process.env before importing the constant
// We need to use vi.doMock because the constant is evaluated at import time
describe('Media Path Configuration', () => {
    beforeEach(() => {
        vi.resetModules()
    })

    afterEach(() => {
        vi.unstubAllEnvs()
    })

    it('should use default path when MEDIA_BASE_PATH is not set', async () => {
        delete process.env.MEDIA_BASE_PATH
        const { MEDIA_BASE_PATH } = await import('@shared/constants')
        expect(MEDIA_BASE_PATH).toBe('/media/videos')
    })

    it('should use custom path when MEDIA_BASE_PATH is set', async () => {
        process.env.MEDIA_BASE_PATH = '/custom/media/path'
        const { MEDIA_BASE_PATH } = await import('@shared/constants')
        expect(MEDIA_BASE_PATH).toBe('/custom/media/path')
    })

    it('should validate paths against custom root', async () => {
        process.env.MEDIA_BASE_PATH = '/custom/root'
        const { MEDIA_BASE_PATH } = await import('@shared/constants')
        const { createPathValidator } = await import('@shared/services/pathValidator')

        const validator = createPathValidator(MEDIA_BASE_PATH)

        // Valid path within custom root
        const validResult = validator.validatePath('subfolder/video.mp4')
        expect(validResult.isValid).toBe(true)

        // The validator resolves against the base path
        // so 'subfolder/video.mp4' becomes '/custom/root/subfolder/video.mp4'
        const expectedPath = path.resolve('/custom/root/subfolder/video.mp4')
        expect(path.resolve(MEDIA_BASE_PATH, 'subfolder/video.mp4')).toBe(expectedPath)
    })
})
