import { logger } from '@shared/services/logger'
import { getScenesStream } from '@vector/services/db'
import type { CollectionVideosMap, VideoCollection } from '../types'

export async function generateFacesBasedCollections(): Promise<CollectionVideosMap> {
  logger.info('Generating dynamic faces-based collections...')

  const facesGroups = new Map<string, Map<string, Set<string>>>()

  // Group scenes by face and source
  for await (const scene of getScenesStream()) {
    for (const face of scene.faces) {
      if (!isValidFace(face)) continue

      if (!facesGroups.has(face)) {
        facesGroups.set(face, new Map())
      }

      const sourceMap = facesGroups.get(face)!

      if (!sourceMap.has(scene.source)) {
        sourceMap.set(scene.source, new Set())
        sourceMap.get(scene.source)!.add(scene.id)
      }
    }
  }

  // Convert to collection format
  const facesCollections: CollectionVideosMap = new Map()

  for (const [faceName, sourceMap] of facesGroups) {
    const videoMap = createVideoMap(sourceMap, 'person')

    if (videoMap.size > 0) {
      facesCollections.set(faceName, videoMap)
    }
  }

  logger.info(`Generated ${facesCollections.size} faces-based collections`)
  return facesCollections
}

function isValidFace(face: string): boolean {
  return Boolean(face) && !face.toLowerCase().includes('unknown')
}

function createVideoMap(sourceMap: Map<string, Set<string>>, matchType: string): Map<string, VideoCollection> {
  const videoMap = new Map<string, VideoCollection>()

  for (const [source, sceneIds] of sourceMap) {
    videoMap.set(source, {
      scenes: Array.from(sceneIds).map((sceneId) => ({
        sceneId,
        confidence: 1,
      })),
      match_type: matchType,
    })
  }

  return videoMap
}
