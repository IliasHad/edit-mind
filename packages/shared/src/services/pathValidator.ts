import pathModule from 'path'
import { logger } from './logger'

export interface PathValidationResult {
    isValid: boolean
    sanitizedPath: string
    error?: string
}

export class PathValidator {
    private allowedBasePath: string
    private blockedPatterns: RegExp[]
    private blockedDirs: Set<string>

    constructor(allowedBasePath: string) {
        this.allowedBasePath = allowedBasePath

        this.blockedPatterns = [
            /\.\./g, // Parent directory traversal
            /~\//g, // Home directory
            /\0/g, // Null bytes
        ]

        // System and hidden directories to block
        this.blockedDirs = new Set([
            '.git',
            '.svn',
            '.hg',
            'node_modules',
            'System Volume Information',
            '$RECYCLE.BIN',
            '.Spotlight-V100',
            '.fseventsd',
            '.Trashes',
            '.DS_Store',
            '.TemporaryItems',
            '.DocumentRevisions-V100',
        ])
    }

    validatePath(inputPath: string): PathValidationResult {
        try {
            let sanitized = inputPath.trim()

            try {
                sanitized = decodeURIComponent(sanitized)
            } catch {
                return {
                    isValid: false,
                    sanitizedPath: '',
                    error: 'Path contains invalid URL encoding',
                }
            }

            // Allow root slash
            if (sanitized === '/') {
                return {
                    isValid: true,
                    sanitizedPath: '/',
                }
            }

            // Check for null bytes
            if (sanitized.includes('\0')) {
                return {
                    isValid: false,
                    sanitizedPath: '',
                    error: 'Path contains null bytes',
                }
            }

            // Check for blocked patterns
            for (const pattern of this.blockedPatterns) {
                if (pattern.test(sanitized)) {
                    logger.warn(`Blocked path pattern detected: ${sanitized}`)
                    return {
                        isValid: false,
                        sanitizedPath: '',
                        error: 'Path contains invalid characters or patterns',
                    }
                }
            }

            // Remove leading slash for path.join to work correctly
            sanitized = sanitized.replace(/^\/+/, '')

            // Resolve the path against the first allowed base path
            const resolvedPath = pathModule.resolve(this.allowedBasePath, sanitized)

            // Check if resolved path is within allowed base paths
            const isWithinAllowedPath = resolvedPath.startsWith(this.allowedBasePath)

            if (!isWithinAllowedPath) {
                logger.warn(`Access denied - path outside allowed directory: ${resolvedPath}`)
                return {
                    isValid: false,
                    sanitizedPath: '',
                    error: 'Access denied: path outside allowed directory',
                }
            }

            // Check for blocked directories in the path
            const pathParts = resolvedPath.split(pathModule.sep)
            for (const part of pathParts) {
                if (this.blockedDirs.has(part)) {
                    logger.warn(`Access denied - blocked directory in path: ${part}`)
                    return {
                        isValid: false,
                        sanitizedPath: '',
                        error: `Access denied: path contains blocked directory '${part}'`,
                    }
                }
            }

            return {
                isValid: true,
                sanitizedPath: inputPath,
            }
        } catch (error) {
            logger.error(`Path validation error: ${error}`)
            return {
                isValid: false,
                sanitizedPath: '',
                error: 'Path validation failed',
            }
        }
    }

    isPathSafe(inputPath: string): boolean {
        return this.validatePath(inputPath).isValid
    }

    getRelativePath(fullPath: string): string | null {
        const validation = this.validatePath(fullPath)
        if (!validation.isValid) return null

        if (validation.sanitizedPath.startsWith(this.allowedBasePath)) {
            return validation.sanitizedPath
        }
        if (validation.sanitizedPath === '/') {
            return this.allowedBasePath
        }
        return null
    }
}

export const createPathValidator = (allowedBasePath: string) => new PathValidator(allowedBasePath)
