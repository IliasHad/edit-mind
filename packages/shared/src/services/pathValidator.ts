import pathModule from 'path'
import { logger } from './logger'

export interface PathValidationResult {
    isValid: boolean
    sanitizedPath: string
    error?: string
}

export interface PathValidatorOptions {
    /**
     * When non-empty, only paths that resolve inside the base plus one of these
     * top-level folder names are accepted. The base itself stays accessible so
     * the root listing can be driven from a separate allowlist.
     */
    allowedTopLevelFolders?: string[]
}

export class PathValidator {
    private allowedBasePath: string
    private blockedPatterns: RegExp[]
    private blockedDirs: Set<string>
    private allowedTopLevelFolders: Set<string> | null

    constructor(allowedBasePath: string, options: PathValidatorOptions = {}) {
        this.allowedBasePath = allowedBasePath

        this.blockedPatterns = [
            /(^|[\\/])\.\.([\\/]|$)/, // Parent directory traversal
            /~\//, // Home directory
            /\0/, // Null bytes
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

        // Allowlist entries must be plain folder names; anything else is ignored
        this.allowedTopLevelFolders = new Set(
            (options.allowedTopLevelFolders ?? [])
                .map((folder) => folder.trim())
                .filter((folder) => folder && !folder.includes('/') && !folder.includes('\\'))
        )
        if (this.allowedTopLevelFolders.size === 0) {
            this.allowedTopLevelFolders = null
        }
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

            // Allow root slash — resolve it to the base so callers always get an absolute path
            if (sanitized === '/') {
                return {
                    isValid: true,
                    sanitizedPath: this.allowedBasePath,
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

            // If the path is already an absolute path within the allowed base, just normalize it.
            // Absolute paths outside the base are rejected — never re-anchored into it.
            // Relative paths resolve against the base.
            let resolvedPath: string
            if (
                pathModule.isAbsolute(sanitized) &&
                (sanitized === this.allowedBasePath ||
                    sanitized.startsWith(this.allowedBasePath + pathModule.sep))
            ) {
                resolvedPath = pathModule.normalize(sanitized)
            } else if (pathModule.isAbsolute(sanitized)) {
                logger.warn(`Access denied - absolute path outside allowed directory: ${sanitized}`)
                return {
                    isValid: false,
                    sanitizedPath: '',
                    error: 'Access denied: path outside allowed directory',
                }
            } else {
                const relative = sanitized.replace(/^\/+/, '')
                resolvedPath = pathModule.resolve(this.allowedBasePath, relative)
            }

            // Check if resolved path is within allowed base paths (prefix must end on a separator
            // so sibling directories such as `base2` never pass a base of `base`)
            const isWithinAllowedPath =
                resolvedPath === this.allowedBasePath ||
                resolvedPath.startsWith(this.allowedBasePath + pathModule.sep)

            if (!isWithinAllowedPath) {
                logger.warn(`Access denied - path outside allowed directory: ${resolvedPath}`)
                return {
                    isValid: false,
                    sanitizedPath: '',
                    error: 'Access denied: path outside allowed directory',
                }
            }

            // Components belonging to the allowed base itself are exempt from the
            // per-component checks below (e.g. a base like /app/data/.thumbnails)
            const exemptedParts = this.allowedBasePath
                .split(pathModule.sep)
                .filter((part) => part !== '')

            // Check each component below the base: reject hidden (dot) components,
            // such as .env / .claude / .DS_Store files and folders
            const pathParts = resolvedPath.split(pathModule.sep).filter((part) => part !== '')
            for (let i = exemptedParts.length; i < pathParts.length; i++) {
                const part = pathParts[i]
                if (this.blockedDirs.has(part)) {
                    logger.warn(`Access denied - blocked directory in path: ${part}`)
                    return {
                        isValid: false,
                        sanitizedPath: '',
                        error: `Access denied: path contains blocked directory '${part}'`,
                    }
                }
                if (part.startsWith('.')) {
                    logger.warn(`Access denied - hidden path component: ${part}`)
                    return {
                        isValid: false,
                        sanitizedPath: '',
                        error: `Access denied: path contains hidden component '${part}'`,
                    }
                }
            }

            // Enforce the top-level folder allowlist when one is configured
            if (this.allowedTopLevelFolders) {
                const relativeToBase = resolvedPath.slice(this.allowedBasePath.length + pathModule.sep.length)
                const topLevel = relativeToBase.split(pathModule.sep)[0] || ''
                const isCaseMatch =
                    topLevel &&
                    [...this.allowedTopLevelFolders].some(
                        (folder) => folder.toLowerCase() === topLevel.toLowerCase()
                    )
                if (!relativeToBase && !topLevel) {
                    // The base itself is always allowed so root listings still resolve
                } else if (!isCaseMatch) {
                    logger.warn(
                        `Access denied - folder not in allowlist: ${topLevel || resolvedPath}`
                    )
                    return {
                        isValid: false,
                        sanitizedPath: '',
                        error: `Access denied: '${topLevel}' is not an allowed media folder`,
                    }
                }
            }

            return {
                isValid: true,
                sanitizedPath: resolvedPath,
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

        if (
            validation.sanitizedPath === this.allowedBasePath ||
            validation.sanitizedPath.startsWith(this.allowedBasePath + pathModule.sep)
        ) {
            return validation.sanitizedPath
        }
        return null
    }
}

export const createPathValidator = (
    allowedBasePath: string,
    options: PathValidatorOptions = {}
) => new PathValidator(allowedBasePath, options)
