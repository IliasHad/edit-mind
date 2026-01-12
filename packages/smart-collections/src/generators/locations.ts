import { logger } from '@shared/services/logger'
import { normalizeLocation } from '@shared/utils/location'
import { getAllVideos } from '@vector/services/vectorDb'
import type { CollectionVideosMap, VideoCollection } from '../types'

export async function generateLocationBasedCollections(): Promise<CollectionVideosMap> {
    logger.info('Generating dynamic location-based collections...')

    const allVideos = await getAllVideos()
    const locationGroups = new Map<string, Map<string, Set<string>>>()

    // Group scenes by location and source
    for (const video of allVideos) {
        const location = await normalizeLocation(video.location?.toString())

        if (!location || !isValidLocation(location)) continue

        if (!locationGroups.has(location)) {
            locationGroups.set(location, new Map())
        }

        const sourceMap = locationGroups.get(location)!
        if (!video.scenes) continue

        for (const scene of video.scenes) {
            if (!sourceMap.has(scene.source)) {
                sourceMap.set(scene.source, new Set())
            }
            sourceMap.get(scene.source)!.add(scene.id)
        }
    }

    // Convert to collection format
    const locationCollections: CollectionVideosMap = new Map()

    for (const [location, sourceMap] of locationGroups) {
        const videoMap = createVideoMap(sourceMap, 'geographic_location')

        if (videoMap.size > 0) {
            locationCollections.set(location, videoMap)
        }
    }

    logger.info(`Generated ${locationCollections.size} location-based collections`)
    return locationCollections
}

function isValidLocation(location: string | null): location is string {
    if (!location) return false

    const normalized = location.toLowerCase()
    return !normalized.includes('n/a') && !normalized.includes('unknown')
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
