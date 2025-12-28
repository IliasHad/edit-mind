import fs from 'fs'
import { logger } from '../services/logger'

export const validateFile = async (filePath: string): Promise<void> => {
  try {
    await fs.promises.access(filePath, fs.constants.R_OK)
  } catch {
    throw new Error(`Cannot access file: ${filePath}`)
  }
}

export const cleanupFiles = (files: string[]): void => {
  files.forEach((file) => {
    try {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file)
      }
    } catch (error) {
      logger.warn(`Failed to delete file ${file}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })
}

export const ensureDirectoryExists = (dirPath: string): void => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}
