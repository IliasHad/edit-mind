import { describe, expect, it } from 'vitest'
import type { Metadata, QueryResult } from 'chromadb'
import type { Scene } from '@shared/types'
import { collectScenesFromQuery } from '../src/utils/query'

const createMetadata = (suffix: string): Metadata => ({
  source: `/videos/source-${suffix}.mp4`,
  thumbnailUrl: `/thumbs/${suffix}.jpg`,
  startTime: 1,
  endTime: 2,
  faces: 'Alice',
  objects: 'camera',
  transcription: `transcription ${suffix}`,
  emotions: JSON.stringify([{ name: 'Alice', emotion: 'happy', confidence: 90 }]),
  description: `description ${suffix}`,
  shotType: 'close-up',
  detectedText: `text ${suffix}`,
  createdAt: 1_700_000_000_000,
  location: 'Studio',
  camera: 'Canon C70',
  duration: 10,
  aspectRatio: '16:9',
  labels: JSON.stringify([{ topic: suffix }]),
})

const createQueryResult = (metadatas: Metadata[][], ids: string[][], documents: string[][]) =>
  ({
    metadatas,
    ids,
    documents,
  }) as unknown as QueryResult<Metadata>

describe('collectScenesFromQuery', () => {
  it('collects every hit from a Chroma query row in order', () => {
    const finalScenes: Scene[] = []
    const scenesIds = new Set<string>()
    const queryResult = createQueryResult(
      [[createMetadata('a'), createMetadata('b'), createMetadata('c')]],
      [['scene-a', 'scene-b', 'scene-c']],
      [['text a', 'text b', 'text c']]
    )

    collectScenesFromQuery(queryResult, scenesIds, finalScenes)

    expect(finalScenes.map((scene) => scene.id)).toEqual(['scene-a', 'scene-b', 'scene-c'])
  })

  it('skips duplicate scene ids and continues collecting later hits', () => {
    const finalScenes: Scene[] = []
    const scenesIds = new Set<string>(['scene-b'])
    const queryResult = createQueryResult(
      [[createMetadata('a'), createMetadata('b'), createMetadata('c')]],
      [['scene-a', 'scene-b', 'scene-c']],
      [['text a', 'text b', 'text c']]
    )

    collectScenesFromQuery(queryResult, scenesIds, finalScenes)

    expect(finalScenes.map((scene) => scene.id)).toEqual(['scene-a', 'scene-c'])
  })

  it('skips malformed rows and incomplete triples without crashing', () => {
    const finalScenes: Scene[] = []
    const scenesIds = new Set<string>()
    const queryResult = createQueryResult(
      [
        [createMetadata('a'), createMetadata('missing-document')],
        [createMetadata('missing-id-row')],
      ],
      [['scene-a', 'scene-missing-document']],
      [['text a']]
    )

    expect(() => collectScenesFromQuery(queryResult, scenesIds, finalScenes)).not.toThrow()
    expect(finalScenes.map((scene) => scene.id)).toEqual(['scene-a'])
  })
})
