import { promises as fs } from 'fs'
import path from 'path'
import { existsSync } from 'fs'
import { FACES_DIR, UNKNOWN_FACES_DIR } from '@shared/constants';

const FACES_PER_PAGE = 40

export const getAllUnknownFaces = async (page = 1, limit = FACES_PER_PAGE) => {
  if (UNKNOWN_FACES_DIR && !existsSync(UNKNOWN_FACES_DIR)) {
    return {
      faces: [],
      total: 0,
      page,
      totalPages: 0,
      hasMore: false,
    }
  }

  const files = await fs.readdir(UNKNOWN_FACES_DIR)
  const jsonFiles = files.filter((file) => file.endsWith('.json'))

  const total = jsonFiles.length
  const totalPages = Math.ceil(total / limit)
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit

  const paginatedFiles = jsonFiles.slice(startIndex, endIndex)

  const faces = await Promise.all(
    paginatedFiles.map(async (file) => {
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
    faces: faces.filter((face) => face),
    total,
    page,
    totalPages,
    hasMore: page < totalPages,
  }
}

export const getAllKnownFaces = async () => {
  if (!existsSync(FACES_DIR)) {
    await fs.mkdir(FACES_DIR, { recursive: true })
    return null
  }
  const peopleFolders = await fs.readdir(FACES_DIR, { withFileTypes: true })

  const result: Record<string, string> = {}

  for (const entry of peopleFolders) {
    if (!entry.isDirectory()) continue

    const personName = entry.name
    const personFolder = path.join(FACES_DIR, personName)

    const files = await fs.readdir(personFolder)
    const jpgFiles = files.filter((f) => f.toLowerCase().endsWith('.jpg'))

    if (jpgFiles.length === 0) continue

    jpgFiles.sort()

    const lastImage = jpgFiles[jpgFiles.length - 1]

    result[personName] = path.join(personName, lastImage)
  }

  return result
}