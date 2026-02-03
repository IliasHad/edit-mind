import fs from 'fs/promises'
import { existsSync } from 'fs'

import path from 'path'
import fetch from 'node-fetch'
import { FACES_DIR, PERMISSIONS } from '../constants'
import type {
  ApiTestResponse,
  AssetsBucketResponse,
  Face,
  ImmichAsset,
  ImmichConfig,
  PeopleResponse,
  Person,
  TimeBucket,
} from '../types/immich'
import * as Jimp from 'jimp'
import { logger } from '@shared/services/logger'

const PAGE_SIZE = 100
export class ImmichClient {
  private config: ImmichConfig

  constructor(config: ImmichConfig) {
    this.config = config
  }

  private get headers() {
    return { 'x-api-key': this.config.apiKey }
  }

  private async fetchJson<T>(endpoint: string): Promise<T> {
    try {
      const url = `${this.config.baseUrl}${endpoint}`
      const response = await fetch(url, { headers: this.headers })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} fetching ${endpoint}`)
      }

      return response.json() as Promise<T>
    } catch (error) {
      logger.error(error)
      throw error
    }
  }

  private async fetchBuffer(endpoint: string): Promise<Buffer> {
    const url = `${this.config.baseUrl}${endpoint}`
    const response = await fetch(url, { headers: this.headers })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} fetching ${endpoint}`)
    }

    return Buffer.from(await response.arrayBuffer())
  }

  async getAllPeople(): Promise<Person[]> {
    const people: Person[] = []
    let page = 1
    let hasNextPage = true

    while (hasNextPage) {
      const data = await this.fetchJson<PeopleResponse>(`/api/people?page=${page}&size=${PAGE_SIZE}&withHidden=false`)

      if (!data.people?.length) break

      people.push(...data.people)
      hasNextPage = data.hasNextPage
      page++
    }

    return people
  }

  async getTimeBuckets(): Promise<TimeBucket[]> {
    return this.fetchJson<TimeBucket[]>('/api/timeline/buckets')
  }

  async getAssetsByPersonAndBucket(personId: string, timeBucket: string): Promise<string[]> {
    const data = await this.fetchJson<AssetsBucketResponse>(
      `/api/timeline/bucket?personId=${personId}&timeBucket=${timeBucket}`
    )
    return data.id || []
  }

  async getFacesByAsset(assetId: string): Promise<Face[]> {
    return this.fetchJson<Face[]>(`/api/faces?id=${assetId}`)
  }

  async getAssetImage(assetId: string): Promise<Buffer> {
    return this.fetchBuffer(`/api/assets/${assetId}/original`)
  }

  async getAsset(assetId: string): Promise<ImmichAsset> {
    return this.fetchJson<ImmichAsset>(`/api/assets/${assetId}`)
  }

  async getPersonThumbnail(personId: string): Promise<Buffer> {
    return this.fetchBuffer(`/api/people/${personId}/thumbnail`)
  }
  async testConnection(): Promise<ApiTestResponse> {
    return this.fetchJson('/api/api-keys/me')
  }
}

export async function processImmichFaces(config: ImmichConfig): Promise<{ name: string; image_path: string }[]> {
  const client = new ImmichClient(config)
  const newFaceFiles: { name: string; image_path: string }[] = []

  try {
    const [people, buckets] = await Promise.all([client.getAllPeople(), client.getTimeBuckets()])

    for (const person of people) {
      const personFaces = await processPerson(client, person, buckets)

      newFaceFiles.push(...personFaces.map((face) => ({ name: person.name, image_path: face })))
    }

    return newFaceFiles
  } catch (error) {
    logger.error('Failed to import Immich faces:' + error)
    throw error
  }
}

export async function processPerson(client: ImmichClient, person: Person, buckets: TimeBucket[]): Promise<string[]> {
  const personDir = await createPersonDirectory(person)

  const assetIds = await collectAssetIds(client, person.id, buckets)

  const newFaceFiles = await processAssets(client, person, assetIds, personDir)
  await savePersonThumbnail(client, person.id, personDir)

  return newFaceFiles
}

export async function createPersonDirectory(person: Person): Promise<string> {
  const personDir = path.join(FACES_DIR, person.name)
  if (!existsSync(personDir)) {
    await fs.mkdir(personDir, { recursive: true })
  }
  return personDir
}

async function collectAssetIds(client: ImmichClient, personId: string, buckets: TimeBucket[]): Promise<string[]> {
  const assetIdArrays = await Promise.all(
    buckets.map((bucket) => client.getAssetsByPersonAndBucket(personId, bucket.timeBucket))
  )

  return assetIdArrays.flat()
}

async function processAssets(
  client: ImmichClient,
  person: Person,
  assetIds: string[],
  personDir: string
): Promise<string[]> {
  const newFaceFiles: string[] = []

  for (const assetId of assetIds) {
    try {
      const assetFaces = await processAssetForPerson(client, person.name, assetId, personDir)
      if (assetFaces.length) {
        newFaceFiles.push(...assetFaces)
      }
    } catch (error) {
      logger.error(`Failed to process asset ${assetId} for person ${person.id}: ${error}`)
    }
  }

  return newFaceFiles
}

export async function processAssetForPerson(
  client: ImmichClient,
  personName: string,
  assetId: string,
  personDir: string
): Promise<string[]> {
  const asset = await client.getAsset(assetId)
  const matchedFaces = asset.people
    .find((person) => person.name === personName)
    ?.faces.filter((face) => face.sourceType !== 'exif')

  if (!matchedFaces || !matchedFaces.length) return []

  if (!asset.originalMimeType.includes('image')) {
    return []
  }

  const imageBuffer = await client.getAssetImage(assetId)
  const faceFiles = await Promise.all(
    matchedFaces.map((face) => extractAndSaveFace(imageBuffer, face, personDir, asset.originalFileName))
  )

  return faceFiles.filter((file): file is string => file !== null)
}

async function extractAndSaveFace(
  imageBuffer: Buffer,
  face: Face,
  personDir: string,
  originalFileName: string
): Promise<string | null> {
  try {
    const faceImage = await Jimp.Jimp.read(imageBuffer)

    const imgWidth = face.imageWidth
    const imgHeight = face.imageHeight

    const x1 = face.boundingBoxX1
    const y1 = face.boundingBoxY1
    const x2 = face.boundingBoxX2
    const y2 = face.boundingBoxY2

    const width = x2 - x1
    const height = y2 - y1

    if (width <= 0 || height <= 0) {
      logger.warn(`Invalid bounding box for face ${face.id}`)
      return null
    }

    faceImage.crop({
      x: Math.max(0, x1),
      y: Math.max(0, y1),
      w: Math.min(width, imgWidth - x1),
      h: Math.min(height, imgHeight - y1),
    })

    const filePath = path.join(personDir, `${face.id}.jpg`)
    await faceImage.write(`${personDir}/${originalFileName.split('.')[0]}_face.jpg`)

    return filePath
  } catch (error) {
    logger.error(`Failed to extract face ${face.id}: ${error}`)
    return null
  }
}

async function savePersonThumbnail(client: ImmichClient, personId: string, personDir: string) {
  try {
    const thumbnail = await client.getPersonThumbnail(personId)
    const filePath = path.join(personDir, `${personId}-thumb.jpg`)
    await fs.writeFile(filePath, thumbnail)
  } catch (error) {
    logger.error(`Failed to save thumbnail for person ${personId}: ${error}`)
  }
}

export async function testImmichConnection(
  config: ImmichConfig
): Promise<{ validConnection: boolean; validPermissions: boolean }> {
  try {
    const client = new ImmichClient(config)
    const response = await client.testConnection()
    const permissionsMatching = JSON.stringify(response.permissions.sort()) === JSON.stringify(PERMISSIONS.sort())

    if (permissionsMatching) {
      return { validConnection: true, validPermissions: true }
    }
    return { validConnection: true, validPermissions: false }
  } catch (error) {
    console.error('Connection test failed:', error)
    return { validConnection: false, validPermissions: false }
  }
}
