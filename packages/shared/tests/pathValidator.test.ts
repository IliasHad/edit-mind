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
      expect(result.sanitizedPath).toBe(testPath)
      expect(result.error).toBeUndefined()
    })

    it('should handle paths starting with ./', () => {
      const testPath = './folder/file.jpg'
      const result = validator.validatePath(testPath)
      expect(result.isValid).toBe(true)
      expect(result.sanitizedPath).toBe(testPath)
    })

    it('should handle paths with trailing slashes', () => {
      const testPath = 'folder/subfolder/'
      const result = validator.validatePath(testPath)
      expect(result.isValid).toBe(true)
      expect(result.sanitizedPath).toBe(testPath)
    })

    it('should handle paths with double slashes', () => {
      const testPath = 'folder//file.jpg'
      const result = validator.validatePath(testPath)
      expect(result.isValid).toBe(true)
      expect(result.sanitizedPath).toBe(testPath)
    })

    it('should consider a single dot as a valid path to the base directory', () => {
      const result = validator.validatePath('.')
      expect(result.isValid).toBe(true)
      expect(result.sanitizedPath).toBe('.')
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
      expect(result.sanitizedPath).toBe('')
    })

    it('should handle a path that is just a slash', () => {
      const result = validator.validatePath('/')
      expect(result.isValid).toBe(true)
      expect(result.sanitizedPath).toBe('/')
    })

    it('should handle a path with unicode characters', () => {
      const testPath = 'folder/你好世界.txt'
      const result = validator.validatePath(testPath)
      expect(result.isValid).toBe(true)
      expect(result.sanitizedPath).toBe(testPath)
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
})
