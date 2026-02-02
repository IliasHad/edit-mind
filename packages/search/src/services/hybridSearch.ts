import type { VideoWithScenesAndMatch } from '@shared/types/video'

interface HybridSearchResult extends VideoWithScenesAndMatch {
  score: number
  textScore?: number
  imageScore?: number
  audioScore?: number
  matchType?: 'image' | 'text' | 'audio' | 'hybrid'
}

interface CombineResultsOptions {
  imageWeight: number
  textWeight: number
  audioWeight?: number
  hasQuery: boolean
  boostFactor?: number
  minScore?: number
  maxResults?: number
}

/**
 * Combines image and text search results using weighted scoring
 *
 * @param imageResults - Results from image-based search
 * @param textResults - Results from text-based search
 * @param options - Configuration for combining results
 * @returns Sorted array of combined results with scores
 */
export function combineResults(
  imageResults: VideoWithScenesAndMatch[],
  textResults: VideoWithScenesAndMatch[],
  options: CombineResultsOptions
): HybridSearchResult[] {
  const { imageWeight, textWeight, hasQuery, boostFactor = 1.2, minScore = 0, maxResults } = options

  // Validate inputs
  if (imageWeight < 0 || textWeight < 0) {
    throw new Error('Weights must be non-negative')
  }

  if (imageWeight + textWeight === 0) {
    throw new Error('At least one weight must be greater than 0')
  }

  // Normalize weights to sum to 1
  const totalWeight = imageWeight + textWeight
  const normalizedImageWeight = imageWeight / totalWeight
  const normalizedTextWeight = textWeight / totalWeight

  // Early return for image-only search
  if (!hasQuery || textResults.length === 0) {
    return normalizeResults(imageResults, 'image')
      .filter((result) => result.score >= minScore)
      .slice(0, maxResults)
  }

  // Early return for text-only search (no image provided)
  if (imageResults.length === 0) {
    return normalizeResults(textResults, 'text')
      .filter((result) => result.score >= minScore)
      .slice(0, maxResults)
  }

  // Build result map with combined scoring
  const resultMap = new Map<string, HybridSearchResult>()

  // Process image results with rank-based normalization
  processResults(imageResults, resultMap, {
    scoreKey: 'imageScore',
    weight: normalizedImageWeight,
  })

  // Process text results and combine scores
  processResults(textResults, resultMap, {
    scoreKey: 'textScore',
    weight: normalizedTextWeight,
  })

  // Convert map to array
  let combinedResults = Array.from(resultMap.values())

  // Apply boost for hybrid matches
  combinedResults = applyHybridBoost(combinedResults, boostFactor)

  // Sort by final score (descending)
  combinedResults.sort((a, b) => b.score - a.score)

  // Apply filters and limits
  combinedResults = combinedResults.filter((result) => result.score >= minScore)

  if (maxResults && maxResults > 0) {
    combinedResults = combinedResults.slice(0, maxResults)
  }

  return combinedResults
}

/**
 * Combines image and text search results using weighted scoring
 *
 * @param imageResults - Results from image-based search
 * @param textResults - Results from text-based search
 * @param options - Configuration for combining results
 * @returns Sorted array of combined results with scores
 */
export function combineAllResults(
  imageResults: VideoWithScenesAndMatch[],
  textResults: VideoWithScenesAndMatch[],
  audioResults: VideoWithScenesAndMatch[],
  options: CombineResultsOptions
): HybridSearchResult[] {
  const { imageWeight, textWeight, hasQuery, boostFactor = 1.2, minScore = 0, maxResults, audioWeight } = options

  // Validate inputs
  if (imageWeight < 0 || textWeight < 0) {
    throw new Error('Weights must be non-negative')
  }

  if (imageWeight + textWeight === 0) {
    throw new Error('At least one weight must be greater than 0')
  }

  // Normalize weights to sum to 1
  const totalWeight = imageWeight + textWeight
  const normalizedImageWeight = imageWeight / totalWeight
  const normalizedTextWeight = textWeight / totalWeight
  const normalizedAudioWeight = (audioWeight || 0) / totalWeight

  // Early return for image-only search
  if (!hasQuery || textResults.length === 0) {
    return normalizeResults(imageResults, 'image')
      .filter((result) => result.score >= minScore)
      .slice(0, maxResults)
  }

  // Early return for text-only search (no image provided)
  if (imageResults.length === 0) {
    return normalizeResults(textResults, 'text')
      .filter((result) => result.score >= minScore)
      .slice(0, maxResults)
  }

  // Build result map with combined scoring
  const resultMap = new Map<string, HybridSearchResult>()

  // Process image results with rank-based normalization
  processResults(imageResults, resultMap, {
    scoreKey: 'imageScore',
    weight: normalizedImageWeight,
  })

  // Process text results and combine scores
  processResults(textResults, resultMap, {
    scoreKey: 'textScore',
    weight: normalizedTextWeight,
  })

  // Process audio results and combine scores
  processResults(audioResults, resultMap, {
    scoreKey: 'audioScore',
    weight: normalizedAudioWeight,
  })
  // Convert map to array
  let combinedResults = Array.from(resultMap.values())

  // Apply boost for hybrid matches
  combinedResults = applyHybridBoost(combinedResults, boostFactor)

  // Sort by final score (descending)
  combinedResults.sort((a, b) => b.score - a.score)

  // Apply filters and limits
  combinedResults = combinedResults.filter((result) => result.score >= minScore)

  if (maxResults && maxResults > 0) {
    combinedResults = combinedResults.slice(0, maxResults)
  }

  return combinedResults
}

/**
 * Normalize results using rank-based scoring
 */
function normalizeResults(results: VideoWithScenesAndMatch[], matchType: 'image' | 'text'): HybridSearchResult[] {
  return results.map((result, index) => {
    const normalizedScore = calculateRankScore(index, results.length)
    return {
      ...result,
      score: normalizedScore,
      ...(matchType === 'image' ? { imageScore: normalizedScore } : { textScore: normalizedScore }),
      matchType,
    }
  })
}

/**
 * Calculate rank-based score with decay
 * Uses exponential decay to emphasize top results
 */
function calculateRankScore(rank: number, totalResults: number): number {
  if (totalResults === 0) return 0

  // Exponential decay: score = e^(-k * rank)
  // Adjusted to give first result score of ~1.0 and decay smoothly
  const decayFactor = 3 / Math.max(totalResults, 1)
  return Math.exp(-decayFactor * rank)
}

/**
 * Process results and add to result map
 */
function processResults(
  results: VideoWithScenesAndMatch[],
  resultMap: Map<string, HybridSearchResult>,
  config: {
    scoreKey: 'imageScore' | 'textScore' | 'audioScore'
    weight: number
  }
): void {
  const { scoreKey, weight } = config

  results.forEach((result, index) => {
    const normalizedScore = calculateRankScore(index, results.length)
    const weightedScore = normalizedScore * weight
    const existing = resultMap.get(result.source)

    if (existing) {
      // Combine with existing result
      existing[scoreKey] = normalizedScore
      existing.score += weightedScore
    } else {
      // Create new result entry
      resultMap.set(result.source, {
        ...result,
        [scoreKey]: normalizedScore,
        score: weightedScore,
      })
    }
  })
}

/**
 * Apply boost factor to results that appear in both searches
 */
function applyHybridBoost(results: HybridSearchResult[], boostFactor: number): HybridSearchResult[] {
  return results.map((result) => {
    const isHybrid = result.imageScore !== undefined && result.textScore !== undefined && result.audioScore

    if (isHybrid) {
      result.matchType = 'hybrid'
      result.score *= boostFactor
    }
    if (result.audioScore) {
      result.matchType = 'audio'
    } else if (result.imageScore !== undefined) {
      result.matchType = 'image'
    } else {
      result.matchType = 'text'
    }

    return result
  })
}

/**
 * Alternative scoring strategy: Harmonic mean for hybrid results
 * Can be used instead of weighted average for more balanced scoring
 */
export function combineResultsWithHarmonicMean(
  imageResults: VideoWithScenesAndMatch[],
  textResults: VideoWithScenesAndMatch[],
  options: Omit<CombineResultsOptions, 'imageWeight' | 'textWeight'>
): HybridSearchResult[] {
  const { hasQuery, boostFactor = 1.5, minScore = 0, maxResults } = options

  if (!hasQuery || textResults.length === 0) {
    return normalizeResults(imageResults, 'image')
      .filter((result) => result.score >= minScore)
      .slice(0, maxResults)
  }

  const resultMap = new Map<string, HybridSearchResult>()

  // Process both result sets
  imageResults.forEach((result, index) => {
    const score = calculateRankScore(index, imageResults.length)
    resultMap.set(result.source, {
      ...result,
      imageScore: score,
      score: score,
    })
  })

  textResults.forEach((result, index) => {
    const score = calculateRankScore(index, textResults.length)
    const existing = resultMap.get(result.source)

    if (existing && existing.imageScore) {
      // Use harmonic mean for hybrid results
      const harmonicMean = (2 * existing.imageScore * score) / (existing.imageScore + score)
      existing.textScore = score
      existing.score = harmonicMean * boostFactor
      existing.matchType = 'hybrid'
    } else if (existing) {
      existing.textScore = score
      existing.score = score
    } else {
      resultMap.set(result.source, {
        ...result,
        textScore: score,
        score: score,
        matchType: 'text',
      })
    }
  })

  // Sort and filter
  const combinedResults = Array.from(resultMap.values())
    .sort((a, b) => b.score - a.score)
    .filter((result) => result.score >= minScore)

  return maxResults ? combinedResults.slice(0, maxResults) : combinedResults
}
