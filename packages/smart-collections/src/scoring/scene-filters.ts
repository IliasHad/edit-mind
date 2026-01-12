import type { Scene } from '@shared/types/scene'
import type { SceneFilters } from '../types'

const DEFAULT_ASPECT_RATIO = 1.778 // 16:9

export function passesFilters(scene: Scene, filters: SceneFilters): boolean {
    if (!passesDurationFilter(scene, filters)) return false
    if (!passesAspectRatioFilter(scene, filters)) return false
    if (!passesFaceCountFilter(scene, filters)) return false

    return true
}

function passesDurationFilter(scene: Scene, filters: SceneFilters): boolean {
    const duration = scene.endTime - scene.startTime

    if (filters.min_duration !== undefined && duration < filters.min_duration) {
        return false
    }

    if (filters.max_duration !== undefined && duration > filters.max_duration) {
        return false
    }

    return true
}

function passesAspectRatioFilter(scene: Scene, filters: SceneFilters): boolean {
    if (!filters.aspectRatio_range) return true

    const aspectRatio = calculateAspectRatio(scene)
    const [minAR, maxAR] = filters.aspectRatio_range

    return aspectRatio >= minAR && aspectRatio <= maxAR
}

function passesFaceCountFilter(scene: Scene, filters: SceneFilters): boolean {
    const faceCount = scene.faces?.length || 0

    if (filters.min_faces !== undefined && faceCount < filters.min_faces) {
        return false
    }

    if (filters.max_faces !== undefined && faceCount > filters.max_faces) {
        return false
    }

    return true
}

export function calculateAspectRatio(scene: Scene): number {
    if (!scene.aspectRatio) {
        return DEFAULT_ASPECT_RATIO
    }

    if (typeof scene.aspectRatio === 'number') {
        return scene.aspectRatio
    }

    if (typeof scene.aspectRatio === 'string' && scene.aspectRatio.includes(':')) {
        const [width, height] = scene.aspectRatio.split(':').map(Number)
        return height > 0 ? width / height : DEFAULT_ASPECT_RATIO
    }

    return DEFAULT_ASPECT_RATIO
}