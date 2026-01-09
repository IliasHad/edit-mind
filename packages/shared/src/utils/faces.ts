import { promises as fs } from 'fs'
import path from 'path'
import { existsSync } from 'fs'
import { FACES_DIR, UNKNOWN_FACES_DIR } from '@shared/constants'
import { logger } from '@shared/services/logger'

export const getAllUnknownFaces = async () => {
  if (UNKNOWN_FACES_DIR && !existsSync(UNKNOWN_FACES_DIR)) {
    return {
      faces: [],
    }
  }

  const files = await fs.readdir(UNKNOWN_FACES_DIR)
  const jsonFiles = files.filter((file) => file.endsWith('.json'))

  const faces = await Promise.all(
    jsonFiles.map(async (file) => {
      try {
        const filePath = path.join(UNKNOWN_FACES_DIR, file)
        const content = await fs.readFile(filePath, 'utf-8')
        return JSON.parse(content)
      } catch {
        return null
      }
    })
  )

  return {
    faces: faces
      .filter((face) => face)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
  }
}

export const getAllKnownFaces = async () => {
  if (!existsSync(FACES_DIR)) {
    await fs.mkdir(FACES_DIR, { recursive: true })
    return null
  }
  const peopleFolders = await fs.readdir(FACES_DIR, { withFileTypes: true })

  const result: Record<string, string[]> = {}

  for (const entry of peopleFolders) {
    if (!entry.isDirectory()) continue

    const personName = entry.name
    const personFolder = path.join(FACES_DIR, personName)

    const files = await fs.readdir(personFolder)
    const jpgFiles = files.filter((f) => f.toLowerCase().endsWith('.jpg'))

    if (jpgFiles.length === 0) {
      result[personName] = []
      continue
    }

    jpgFiles.sort()

    result[personName] = jpgFiles.map((file) => path.join(personName, file))
  }

  return result
}
export const getImagesByPersonName = async (personName: string) => {
  try {
    const personFiles = await fs.readdir(path.join(FACES_DIR, personName))

    const jpgFiles = personFiles.filter((f) => f.toLowerCase().endsWith('.jpg'))

    jpgFiles.sort()

    return jpgFiles
  } catch (error) {
    logger.error(error)
    return []
  }
}

export async function rebuildFacesCache(): Promise<void> {
  try {
    const entries = await fs.readdir(FACES_DIR, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(FACES_DIR, entry.name)

      if (entry.isFile() && entry.name.endsWith('.pkl')) {
        // Remove .pkl file
        await fs.unlink(fullPath)
        logger.debug(`Deleted: ${fullPath}`)
      }
    }

    logger.debug('All .pkl files removed successfully')
  } catch (error) {
    console.error('Error removing .pkl files:', error)
    throw error
  }
}
