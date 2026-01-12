/**
 * Calculate cosine similarity between two embedding vectors
 */
export function calculateSimilarity(sceneEmbedding: number[], queryEmbedding: number[]): number {
    if (!sceneEmbedding?.length || !queryEmbedding?.length) {
        return 0
    }

    const sceneNorm = calculateNorm(sceneEmbedding)
    const queryNorm = calculateNorm(queryEmbedding)

    if (sceneNorm === 0 || queryNorm === 0) {
        return 0
    }

    const sceneNormalized = normalizeVector(sceneEmbedding, sceneNorm)
    const queryNormalized = normalizeVector(queryEmbedding, queryNorm)

    const dotProduct = calculateDotProduct(sceneNormalized, queryNormalized)

    return clamp(dotProduct, -1, 1)
}

function calculateNorm(vector: number[]): number {
    return Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0))
}

function normalizeVector(vector: number[], norm: number): number[] {
    return vector.map((value) => value / norm)
}

function calculateDotProduct(vec1: number[], vec2: number[]): number {
    return vec1.reduce((sum, value, index) => sum + value * vec2[index], 0)
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
}

/**
 * Calculate weighted similarity score from multiple embeddings
 */
export function calculateWeightedEmbeddingScore(
    visualSimilarity: number,
    audioSimilarity: number,
    textSimilarity: number,
    weights: { visual: number; audio: number; text: number },
    hasVisualEmbedding: boolean,
    hasAudioEmbedding: boolean,
    hasTextEmbedding: boolean
): number {
    let score = 0
    let totalWeight = 0

    if (visualSimilarity > 0 && hasVisualEmbedding) {
        score += visualSimilarity * weights.visual
        totalWeight += weights.visual
    }

    if (audioSimilarity > 0 && hasAudioEmbedding) {
        score += audioSimilarity * weights.audio
        totalWeight += weights.audio
    }

    if (textSimilarity > 0 && hasTextEmbedding) {
        score += textSimilarity * weights.text
        totalWeight += weights.text
    }

    return totalWeight > 0 ? score / totalWeight : 0
}