import * as fs from 'fs/promises'
import * as path from 'path'
import fetch from 'node-fetch'
import { FACES_DIR } from '../constants';
import { AssetsBucketResponse, Face, ImmichConfig, PeopleResponse, Person, TimeBucket } from '../types/immich'
import * as Jimp from 'jimp'
import { logger } from './logger'

const PAGE_SIZE = 100

class ImmichClient {
  private config: ImmichConfig

  constructor(config: ImmichConfig) {
    this.config = config
  }

  private get headers() {
    return { 'x-api-key': this.config.apiKey }
  }

  private async fetchJson<T>(endpoint: string): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`
    const response = await fetch(url, { headers: this.headers })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} fetching ${endpoint}`)
    }

    return response.json() as Promise<T>
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

  async getPersonThumbnail(personId: string): Promise<Buffer> {
    return this.fetchBuffer(`/api/people/${personId}/thumbnail`)
  }
}

export async function getAllImmichFaces(config: ImmichConfig): Promise<{ name: string; image_path: string }[]> {
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

async function processPerson(client: ImmichClient, person: Person, buckets: TimeBucket[]): Promise<string[]> {
  const personDir = await createPersonDirectory(person)

  const assetIds = await collectAssetIds(client, person.id, buckets)

  const newFaceFiles = await processAssets(client, person, assetIds, personDir)
  await savePersonThumbnail(client, person.id, personDir)

  return newFaceFiles
}

async function createPersonDirectory(person: Person): Promise<string> {
  const sanitizedName = sanitizeName(person.name || `person-${person.id}`)
  const personDir = path.join(FACES_DIR, sanitizedName)
  await fs.mkdir(personDir, { recursive: true })
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
      const assetFaces = await processAssetForPerson(client, person, assetId, personDir)
      newFaceFiles.push(...assetFaces)
    } catch (error) {
      logger.error(`Failed to process asset ${assetId} for person ${person.id}: ${error}`)
    }
  }

  return newFaceFiles
}

async function processAssetForPerson(
  client: ImmichClient,
  person: Person,
  assetId: string,
  personDir: string
): Promise<string[]> {
  const faces = await client.getFacesByAsset(assetId)
  const matchedFaces = faces.filter((face) => face.person?.id === person.id)

  if (!matchedFaces.length) return []

  const imageBuffer = await client.getAssetImage(assetId)

  const faceFiles = await Promise.all(
    matchedFaces.map((face) => extractAndSaveFace(imageBuffer, face, personDir))
  )

  return faceFiles.filter((file): file is string => file !== null)
}

async function extractAndSaveFace(
  imageBuffer: Buffer,
  face: Face,
  personDir: string
): Promise<string | null> {
  try {
    const { boundingBoxX1, boundingBoxY1, boundingBoxX2, boundingBoxY2 } = face

    const faceImage = await Jimp.Jimp.read(imageBuffer)
    const width = boundingBoxX2 - boundingBoxX1
    const height = boundingBoxY2 - boundingBoxY1

    faceImage.crop({ w: width, h: height, x: boundingBoxX1, y: boundingBoxY1 })

    const fileName = `${face.id}.jpg`
    const filePath = path.join(personDir, fileName)
    await faceImage.write(`${personDir}/${face.id}.jpg`)

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

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]/g, '_');
}
