import type { Scene } from '@shared/types/scene'
import type { CollectionDefinition, MultiSignalBooster, SceneContext, ScoringResult } from '../types'
import { MULTI_SIGNAL_BOOSTERS } from '../constants/collections'

const CAMERA_MOVEMENT_PATTERNS = /(pan|tilt|tracking|dolly|crane|slider)/
const SHALLOW_DOF_PATTERNS = /(bokeh|shallow|depth of field|blurred)/
const DRAMATIC_LIGHTING_PATTERNS = /(dramatic|moody|contrasty|shadow)/

export function calculateMultiSignalBoosters(
    scene: Scene,
    definition: CollectionDefinition,
    collectionName: string
): ScoringResult {
    const breakdown: ScoringResult['breakdown'] = { boosters: [] }
    let totalScore = 0

    const boosters = MULTI_SIGNAL_BOOSTERS?.[collectionName]
    if (!Array.isArray(boosters)) {
        return { score: 0, breakdown }
    }

    const context = extractSceneContext(scene)

    for (const booster of boosters) {
        if (areConditionsMet(booster, context)) {
            totalScore += booster.boost
            breakdown.boosters.push({
                name: `multi_signal_${Object.keys(booster.conditions).join('_')}`,
                value: booster.boost,
            })
        }
    }

    return { score: totalScore, breakdown }
}

function extractSceneContext(scene: Scene): SceneContext {
    return {
        duration: scene.endTime - scene.startTime,
        faceCount: scene.faces?.length || 0,
        sceneDescription: scene.description?.toLowerCase() || '',
        shotType: scene.shotType?.toLowerCase() || '',
        hour: extractHourFromTimestamp(scene.createdAt),
        emotions: scene.emotions.map((e) => e.emotion.toLowerCase()),
    }
}

function areConditionsMet(booster: MultiSignalBooster, context: SceneContext): boolean {
    const { conditions } = booster

    if (conditions.no_faces !== undefined && (context.faceCount === 0) !== conditions.no_faces) {
        return false
    }

    if (conditions.min_duration !== undefined && context.duration < conditions.min_duration) {
        return false
    }

    if (conditions.max_duration !== undefined && context.duration > conditions.max_duration) {
        return false
    }

    if (conditions.camera_movement && !CAMERA_MOVEMENT_PATTERNS.test(context.shotType)) {
        return false
    }

    if (conditions.shallow_dof && !SHALLOW_DOF_PATTERNS.test(context.sceneDescription)) {
        return false
    }

    if (conditions.golden_hour_lighting && !isGoldenHour(context.hour)) {
        return false
    }

    if (conditions.dramatic_lighting && !DRAMATIC_LIGHTING_PATTERNS.test(context.sceneDescription)) {
        return false
    }

    if (conditions.emotions?.length) {
        const hasRequiredEmotion = conditions.emotions.some((emotion) => context.emotions.includes(emotion.toLowerCase()))
        if (!hasRequiredEmotion) {
            return false
        }
    }

    return true
}

function extractHourFromTimestamp(timestampMs: number): number {
    try {
        return new Date(timestampMs).getUTCHours()
    } catch {
        return -1
    }
}

function isGoldenHour(hour: number): boolean {
    if (hour === -1) return false
    // Morning golden hour: 5-8 AM, Evening golden hour: 5-8 PM
    return (hour >= 5 && hour <= 8) || (hour >= 17 && hour <= 20)
}
