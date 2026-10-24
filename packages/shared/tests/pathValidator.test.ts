import fs from 'node:fs'
import os from 'node:os'
import { describe, it, expect, beforeEach } from 'vitest'
import path from 'path'
import { createPathValidator, PathValidator } from '@shared/services/pathValidator'

const MEDIA_BASE_PATH = path.resolve('/media/videos')

describe('PathValidator', () => {
  let validator: PathValidator

  beforeEach(() => {
    validator = createPathValidator(MEDIA_BASE_PATH)
  })

  describe('Valid Paths (Happy Paths)', () => {
    it('should validate a normal nested folder and file path', () => {
      const testPath = 'folder/subfolder/file.txt'
      const result = validator.validatePath(testPath)
      expect(result.isValid).toBe(true)
      expect(result.sanitizedPath).toBe(path.join(MEDIA_BASE_PATH, testPath))
      expect(result.error).toBeUndefined()
    })

    it('should handle paths starting with ./', () => {
      const testPath = './folder/file.jpg'
      const result = validator.validatePath(testPath)
      expect(result.isValid).toBe(true)
      expect(result.sanitizedPath).toBe(path.join(MEDIA_BASE_PATH, 'folder/file.jpg'))
    })

    it('should handle paths with trailing slashes', () => {
      const testPath = 'folder/subfolder/'
      const result = validator.validatePath(testPath)
      expect(result.isValid).toBe(true)
      expect(result.sanitizedPath).toBe(path.join(MEDIA_BASE_PATH, 'folder/subfolder'))
    })

    it('should handle paths with double slashes', () => {
      const testPath = 'folder//file.jpg'
      const result = validator.validatePath(testPath)
      expect(result.isValid).toBe(true)
      expect(result.sanitizedPath).toBe(path.join(MEDIA_BASE_PATH, 'folder/file.jpg'))
    })

    it('should consider a single dot as a valid path to the base directory', () => {
      const result = validator.validatePath('.')
      expect(result.isValid).toBe(true)
      expect(result.sanitizedPath).toBe(MEDIA_BASE_PATH)
    })
  })

  describe('Security: Path Traversal Attacks', () => {
    it('should prevent simple path traversal', () => {
      const result = validator.validatePath('../secrets.txt')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('invalid characters or patterns')
    })

    it('should prevent nested path traversal', () => {
      const result = validator.validatePath('folder/../../secrets.txt')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('invalid characters or patterns')
    })

    it('should prevent URL-encoded path traversal', () => {
      const result = validator.validatePath('folder/%2e%2e/secrets.txt')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('invalid characters or patterns')
    })

    it('should prevent doubly URL-encoded path traversal', () => {
      const result = validator.validatePath('folder/%252e%252e/secrets.txt')
      expect(result.isValid).toBe(true)
    })

    it('should prevent mixed valid and traversal parts', () => {
      const result = validator.validatePath('media/../subfolder/../../etc/passwd')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('invalid characters or patterns')
    })
  })

  describe('Security: Other Vectors', () => {
    it('should reject paths with null bytes', () => {
      const result = validator.validatePath('folder/file\0.jpg')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Path contains null bytes')
    })

    it('should reject paths with home directory tilde', () => {
      const result = validator.validatePath('~/somefile')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Path contains invalid characters or patterns')
    })

    it('should reject paths containing blocked directory names like .git', () => {
      const result = validator.validatePath('folder/.git/config')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe("Access denied: path contains blocked directory '.git'")
    })

    it('should reject paths containing blocked directory names like node_modules', () => {
      const result = validator.validatePath('node_modules/some-lib/index.js')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe("Access denied: path contains blocked directory 'node_modules'")
    })
  })

  describe('Edge Cases', () => {
    it('should handle an empty path string', () => {
      const result = validator.validatePath('')
      expect(result.isValid).toBe(true)
      expect(result.sanitizedPath).toBe(MEDIA_BASE_PATH)
    })

    it('should handle a path that is just a slash', () => {
      const result = validator.validatePath('/')
      expect(result.isValid).toBe(true)
      expect(result.sanitizedPath).toBe(MEDIA_BASE_PATH)
    })

    it('should handle a path with unicode characters', () => {
      const testPath = 'folder/你好世界.txt'
      const result = validator.validatePath(testPath)
      expect(result.isValid).toBe(true)
      expect(result.sanitizedPath).toBe(path.join(MEDIA_BASE_PATH, testPath))
    })
  })

  describe('Helper Methods', () => {
    it('isPathSafe should return true for a valid path', () => {
      expect(validator.isPathSafe('folder/file.txt')).toBe(true)
    })

    it('isPathSafe should return false for an invalid path', () => {
      expect(validator.isPathSafe('../secret.txt')).toBe(false)
    })

    it('getRelativePath should return null for an invalid path', () => {
      const fullPath = path.resolve(MEDIA_BASE_PATH, '../invalid.txt')
      expect(validator.getRelativePath(fullPath)).toBe(null)
    })
  })

  describe('Security: Sibling directory escape', () => {
    it('should reject a sibling directory of the allowed base', () => {
      const result = validator.validatePath('/media/videos-private/secret.mp4')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('path outside allowed directory')
    })

    it('should reject an absolute path outside the allowed base instead of re-anchoring it', () => {
      const result = validator.validatePath('/etc/passwd')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('path outside allowed directory')
    })

    it.each([
      '/README.md',
      '/package.json',
      '/etc/hosts',
      '/private/var/tmp/secret.mp4',
      '/Users/example/.ssh/id_rsa',
    ])('should reject an absolute file outside the allowed base: %s', (outsideFile) => {
      const result = validator.validatePath(outsideFile)

      expect(result.isValid).toBe(false)
      expect(result.sanitizedPath).toBe('')
      expect(result.error).toContain('path outside allowed directory')
    })

    it('should still accept the base itself and paths inside it', () => {
      expect(validator.validatePath('/media/videos').isValid).toBe(true)
      expect(validator.validatePath('/media/videos/folder/file.mp4').isValid).toBe(true)
    })

    it('getRelativePath should reject sibling directories too', () => {
      expect(validator.getRelativePath('/media/videos2/file.mp4')).toBe(null)
    })

    it.each(['/README.md', '/package.json', '/etc/hosts', '/private/var/tmp/secret.mp4'])(
      'getRelativePath should reject an absolute file outside the allowed base: %s',
      (outsideFile) => {
        expect(validator.getRelativePath(outsideFile)).toBe(null)
      }
    )
  })

  describe('Security: hidden components', () => {
    it('should reject dot-files like .env', () => {
      const result = validator.validatePath('.env')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("hidden component '.env'")
    })

    it('should reject dotted directories like .claude', () => {
      const result = validator.validatePath('.claude/projects')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("hidden component '.claude'")
    })

    it('should reject hidden files nested inside normal folders', () => {
      const result = validator.validatePath('folder/.DS_Store')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('.DS_Store')
    })

    it('should still accept normal dotted file names that are not dot-prefixed', () => {
      expect(validator.validatePath('folder/photo.final.jpg').isValid).toBe(true)
    })
  })

  describe('Security: top-level folder allowlist', () => {
    const allowedFolders = ['OGV', 'VHS Demos']
    let allowlistValidator: PathValidator

    beforeEach(() => {
      allowlistValidator = createPathValidator(MEDIA_BASE_PATH, {
        allowedTopLevelFolders: allowedFolders,
      })
    })

    it('should accept paths inside allowed folders', () => {
      expect(allowlistValidator.validatePath('/media/videos/OGV/file.mp4').isValid).toBe(true)
      expect(allowlistValidator.validatePath('/media/videos/VHS Demos/file.mp4').isValid).toBe(true)
    })

    it('should accept the base itself (root listing)', () => {
      expect(allowlistValidator.validatePath('/').isValid).toBe(true)
      expect(allowlistValidator.validatePath('.').isValid).toBe(true)
    })

    it('should reject paths outside allowed folders', () => {
      const result = allowlistValidator.validatePath('/media/videos/Takeout/file.mp4')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("'Takeout' is not an allowed media folder")
    })

    it('should reject top-level files outside allowed folders', () => {
      expect(allowlistValidator.validatePath('loose-video.mp4').isValid).toBe(false)
    })

    it('should match folder names case-insensitively', () => {
      expect(allowlistValidator.validatePath('/media/videos/ogv/file.mp4').isValid).toBe(true)
    })

    it('should still reject hidden components inside allowed folders', () => {
      const result = allowlistValidator.validatePath('/media/videos/OGV/.env')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("hidden component '.env'")
    })

    it('should not enforce an allowlist when none is configured', () => {
      expect(validator.validatePath('/media/videos/Takeout/file.mp4').isValid).toBe(true)
    })
  })

  describe('Security: symlinked allowed roots', () => {
    it('should accept both configured and canonical paths below a symlinked root', () => {
      const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'path-validator-'))
      const targetDirectory = path.join(temporaryRoot, 'target')
      const symlinkDirectory = path.join(temporaryRoot, 'media-link')

      try {
        fs.mkdirSync(targetDirectory)
        fs.symlinkSync(targetDirectory, symlinkDirectory, 'dir')

        const symlinkValidator = createPathValidator(symlinkDirectory)
        expect(symlinkValidator.validatePath(path.join(symlinkDirectory, 'clip.mp4')).isValid).toBe(true)
        const canonicalTarget = fs.realpathSync(targetDirectory)
        expect(symlinkValidator.validatePath(path.join(canonicalTarget, 'clip.mp4')).isValid).toBe(true)
      } finally {
        fs.rmSync(temporaryRoot, { recursive: true, force: true })
      }
    })
  })
})
