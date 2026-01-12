import type { Scene } from '@shared/types/scene'
import type {
    CollectionEmbeddings,
    CollectionWeights,
    MetadataBoosters,
    ScoringBreakdown,
    ScoringResult,
} from '../types'
import { COLLECTION_WEIGHTS } from '@smart-collections/constants/collections';
import { calculateSimilarity, calculateWeightedEmbeddingScore } from './similarity'
import { calculateBRollScore } from './broll'
import { calculateMultiSignalBoosters } from './multi-signal'

const OBJECT_BOOST_PER_MATCH = 0.035
const EMOTION_BOOST_PER_MATCH = 0.06
const SHOT_TYPE_BOOST = 0.05
const MAX_OBJECT_BOOST = 0.15
const MAX_EMOTION_BOOST = 0.15

export function calculateMetadataBoosters(scene: Scene, boosters: MetadataBoosters): ScoringResult {
    const breakdown: ScoringResult['breakdown'] = { boosters: [] }
    let totalScore = 0

    const objectBoost = calculateObjectBoost(scene, boosters.objects)
    if (objectBoost.score > 0) {
        totalScore += objectBoost.score
        breakdown.boosters.push(...objectBoost.breakdown.boosters)
    }

    const emotionBoost = calculateEmotionBoost(scene, boosters.emotions)
    if (emotionBoost.score > 0) {
        totalScore += emotionBoost.score
        breakdown.boosters.push(...emotionBoost.breakdown.boosters)
    }

    const shotTypeBoost = calculateShotTypeBoost(scene, boosters.shotTypes)
    if (shotTypeBoost.score > 0) {
        totalScore += shotTypeBoost.score
        breakdown.boosters.push(...shotTypeBoost.breakdown.boosters)
    }

    return { score: totalScore, breakdown }
}

function calculateObjectBoost(scene: Scene, boosterObjects?: string[]): ScoringResult {
    if (!boosterObjects?.length) {
        return { score: 0, breakdown: { boosters: [] } }
    }

    const sceneObjects = scene.objects.map((obj) => obj.toLowerCase())
    const matchedObjects: string[] = []

    for (const boosterObj of boosterObjects) {
        if (sceneObjects.includes(boosterObj.toLowerCase())) {
            matchedObjects.push(boosterObj)
        }
    }

    if (matchedObjects.length === 0) {
        return { score: 0, breakdown: { boosters: [] } }
    }

    const boost = Math.min(matchedObjects.length * OBJECT_BOOST_PER_MATCH, MAX_OBJECT_BOOST)

    return {
        score: boost,
        breakdown: {
            boosters: [
                {
                    name: `objects_matched(${matchedObjects.join(',')})`,
                    value: boost,
                },
            ],
        },
    }
}

function calculateEmotionBoost(scene: Scene, boosterEmotions?: string[]): ScoringResult {
    if (!boosterEmotions?.length) {
        return { score: 0, breakdown: { boosters: [] } }
    }

    const sceneEmotions = scene.emotions.map((e) => e.emotion.toLowerCase())
    const matchedEmotions: string[] = []

    for (const boosterEmo of boosterEmotions) {
        if (sceneEmotions.includes(boosterEmo.toLowerCase())) {
            matchedEmotions.push(boosterEmo)
        }
    }

    if (matchedEmotions.length === 0) {
        return { score: 0, breakdown: { boosters: [] } }
    }

    const boost = Math.min(matchedEmotions.length * EMOTION_BOOST_PER_MATCH, MAX_EMOTION_BOOST)

    return {
        score: boost,
        breakdown: {
            boosters: [
                {
                    name: `emotions_matched(${matchedEmotions.join(',')})`,
                    value: boost,
                },
            ],
        },
    }
}

function calculateShotTypeBoost(scene: Scene, boosterShotTypes?: string[]): ScoringResult {
    if (!boosterShotTypes?.length) {
        return { score: 0, breakdown: { boosters: [] } }
    }

    const shotType = scene.shotType?.toLowerCase() || ''

    for (const boosterShot of boosterShotTypes) {
        if (shotType.includes(boosterShot.toLowerCase())) {
            return {
                score: SHOT_TYPE_BOOST,
                breakdown: {
                    boosters: [{ name: `shot_type(${boosterShot})`, value: SHOT_TYPE_BOOST }],
                },
            }
        }
    }

    return { score: 0, breakdown: { boosters: [] } }
}

export function calculateSceneScore(
    scene: Scene,
    sceneId: string,
    collectionName: string,
    collectionData: CollectionEmbeddings,
    sceneVisualEmbedding: number[] | null,
    sceneAudioEmbedding: number[] | null,
    sceneTextEmbedding: number[] | null
): ScoringBreakdown {
    const { visual, audio, text, definition } = collectionData

    // Get collection-specific weights or use defaults
    const weights: CollectionWeights = COLLECTION_WEIGHTS[collectionName] || COLLECTION_WEIGHTS.default

    // Calculate embedding similarities
    const visualScore = visual && sceneVisualEmbedding ? calculateSimilarity(sceneVisualEmbedding, visual) : 0
    const audioScore = audio && sceneAudioEmbedding ? calculateSimilarity(sceneAudioEmbedding, audio) : 0
    const textScore = text && sceneTextEmbedding ? calculateSimilarity(sceneTextEmbedding, text) : 0

    // Calculate weighted embedding score
    const embeddingScore = calculateWeightedEmbeddingScore(
        visualScore,
        audioScore,
        textScore,
        weights,
        !!sceneVisualEmbedding,
        !!sceneAudioEmbedding,
        !!sceneTextEmbedding
    )

    // Calculate metadata boosters
    const metadataResult = definition.metadata_boosters
        ? calculateMetadataBoosters(scene, definition.metadata_boosters)
        : { score: 0, breakdown: { boosters: [] } }

    // Calculate multi-signal boosters
    const multiSignalResult = calculateMultiSignalBoosters(scene, definition, collectionName)

    // Calculate B-Roll specific penalties (if applicable)
    const bRollResult =
        collectionName === 'B-Roll' ? calculateBRollScore(scene) : { score: 0, breakdown: { boosters: [], penalties: [] } }

    // Combine all scores
    const finalScore = embeddingScore + metadataResult.score + multiSignalResult.score + bRollResult.score


    // Compile breakdown
    const breakdown: ScoringBreakdown = {
        collectionName,
        visualScore,
        audioScore,
        textScore,
        metadataScore: metadataResult.score,
        bRollScore: bRollResult.score,
        multiSignalBoost: multiSignalResult.score,
        boosters: [
            ...metadataResult.breakdown.boosters,
            ...multiSignalResult.breakdown.boosters,
            ...(bRollResult.breakdown.boosters || []),
        ],
        penalties: bRollResult.breakdown.penalties || [],
        finalScore,
    }

    return breakdown
}
