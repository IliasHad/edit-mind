export interface ScoringBreakdown {
    collectionName: string
    visualScore: number
    audioScore: number
    textScore: number
    metadataScore: number
    bRollScore: number
    multiSignalBoost: number
    boosters: BoosterPenalty[]
    penalties: BoosterPenalty[]
    finalScore: number
    threshold: number
    matched: boolean
}

export interface BoosterPenalty {
    name: string
    value: number
}

export interface ScoringResult {
    score: number
    breakdown: {
        boosters: BoosterPenalty[]
        penalties?: BoosterPenalty[]
    }
}

export interface CollectionWeights {
    visual: number
    audio: number
    text: number
}

export interface CollectionEmbeddings {
    visual: number[] | null
    audio: number[] | null
    text: number[] | null
    definition: CollectionDefinition
}

export interface CollectionDefinition {
    category: string
    description?: string
    visual_queries?: string[]
    audio_queries?: string[]
    filters?: SceneFilters
    required_objects?: string[]
    required_emotions?: string[]
    time_ranges?: number[][]
    metadata_boosters?: MetadataBoosters
}

export interface SceneFilters {
    min_duration?: number
    max_duration?: number
    aspectRatio_range?: [number, number]
    min_faces?: number
    max_faces?: number
}

export interface MetadataBoosters {
    objects?: string[]
    emotions?: string[]
    shotTypes?: string[]
}

export interface MultiSignalConditions {
    no_faces?: boolean
    min_duration?: number
    max_duration?: number
    camera_movement?: boolean
    shallow_dof?: boolean
    golden_hour_lighting?: boolean
    dramatic_lighting?: boolean
    emotions?: string[]
}

export interface MultiSignalBooster {
    conditions: MultiSignalConditions
    boost: number
}

export interface Thresholds {
    embedding: number
    metadata: number
    hybrid: number
}

export interface SceneMatch {
    sceneId: string
    confidence: number
}

export interface VideoCollection {
    scenes: SceneMatch[]
    match_type: string
}

export type CollectionVideosMap = Map<string, Map<string, VideoCollection>>

export interface SceneEmbeddingData {
    id: string
    metadata: Record<string, unknown>
    visualEmbedding: number[] | null
    audioEmbedding: number[] | null
    textEmbedding: number[] | null
}
export type COLLECTION_DEFINITIONS_TYPE = Record<string, CollectionDefinition>

export interface SceneContext {
    duration: number
    faceCount: number
    sceneDescription: string
    shotType: string
    hour: number
    emotions: string[]
}
