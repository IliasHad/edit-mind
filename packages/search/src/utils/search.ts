import { VideoMetadataSummary, SearchSuggestion, SearchAnalytics, VideoSearchParams } from '../types/search'

export const generateSearchSuggestions = (metadataSummary: VideoMetadataSummary): SearchSuggestion[] => {
  const suggestions: SearchSuggestion[] = []

  const { topFaces, topColors, topEmotions, shotTypes, topObjects } = metadataSummary

  if (topFaces?.length)
    suggestions.push({
      text: `scenes with @${topFaces[0].name ?? 'someone'}`,
      icon: '👤',
      category: 'people',
      border: 'border-purple-500',
    })

  if (topColors?.length)
    suggestions.push({
      text: `scenes with ${topColors[0].name ?? 'vibrant'} color`,
      icon: '🎨',
      category: 'color',
      border: 'border-red-500',
    })

  if (topEmotions?.length)
    suggestions.push({
      text: `${topEmotions[0].name ?? 'emotional'} moments`,
      icon: '😊',
      category: 'emotion',
      border: 'border-red-500',
    })

  if (shotTypes?.length)
    suggestions.push({
      text: shotTypes[0].name.replace('-', ' '),
      icon: '🎬',
      category: 'scene',
      border: 'border-teal-500',
    })

  if (topObjects?.length)
    suggestions.push({
      text: `scenes with ${topObjects[0].name ?? 'something'}`,
      icon: '📍',
      category: 'scene',
      border: 'border-indigo-500',
    })

  return suggestions.slice(0, 5)
}

export function getSearchStats(analytics: SearchAnalytics) {
  const searchComplexity = calculateSearchComplexity(analytics.extractedParams)
  const performanceRating = getPerformanceRating(analytics.durationMs)

  return {
    query: analytics.query,
    durationMs: analytics.durationMs,
    resultsCount: analytics.finalResultsCount,
    timestamp: analytics.timestamp,

    performance: {
      rating: performanceRating,
      isFast: analytics.durationMs < 500,
      isAcceptable: analytics.durationMs < 1000,
      needsOptimization: analytics.durationMs > 2000,
    },

    complexity: {
      level: searchComplexity.level,
      score: searchComplexity.score,
      factors: searchComplexity.factors,
    },

    queryDetails: {
      hasFaces: (analytics.extractedParams.faces?.length ?? 0) > 0,
      hasLocations: (analytics.extractedParams.locations?.length ?? 0) > 0,
      hasEmotions: (analytics.extractedParams.emotions?.length ?? 0) > 0,
      hasObjects: (analytics.extractedParams.objects?.length ?? 0) > 0,
      hasTranscription: !!analytics.extractedParams.transcriptionQuery,
      hasSemanticSearch: !!analytics.extractedParams.semanticQuery,
    },
  }
}

function calculateSearchComplexity(params: VideoSearchParams): {
  level: 'simple' | 'moderate' | 'complex'
  score: number
  factors: string[]
} {
  let score = 0
  const factors: string[] = []

  if (params.faces && params.faces.length > 0) {
    score += 1
    factors.push(`${params.faces.length} face(s)`)
  }

  if (params.locations && params.locations.length > 0) {
    score += 1
    factors.push(`${params.locations.length} location(s)`)
  }

  if (params.emotions && params.emotions.length > 0) {
    score += 1
    factors.push(`${params.emotions.length} emotion(s)`)
  }

  if (params.objects && params.objects.length > 0) {
    score += 1
    factors.push(`${params.objects.length} object(s)`)
  }

  if (params.transcriptionQuery) {
    score += 2
    factors.push('transcription search')
  }

  if (params.semanticQuery) {
    score += 2
    factors.push('semantic search')
  }

  const level = score <= 2 ? 'simple' : score <= 4 ? 'moderate' : 'complex'

  return { level, score, factors }
}

function getPerformanceRating(durationMs: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (durationMs < 300) return 'excellent'
  if (durationMs < 500) return 'good'
  if (durationMs < 1000) return 'fair'
  return 'poor'
}
