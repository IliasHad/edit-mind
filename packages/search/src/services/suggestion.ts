import { logger } from '@shared/services/logger'
import { getCache, setCache, invalidateCache } from '@shared/services/cache'
import type { GroupedSuggestions, Suggestion, VideoSearchParams } from '@shared/types/search'
import type { ShotType } from '@shared/types'
import { VideoSearchParamsSchema } from '@shared/schemas/search'
import { getScenesStream } from '@vector/services/db'

interface CacheStats {
  isInitialized: boolean
  lastBuilt: string
  totalTerms: number
  totalScenes: number
  facesCount: number
  objectsCount: number
  emotionsCount: number
  camerasCount: number
  shotTypesCount: number
  transcriptionTermsCount: number
  textTermsCount: number
}

class SearchSuggestionCache {
  private isInitialized = false
  private initializationPromise: Promise<void> | null = null

  private readonly CACHE_PREFIX = 'search:suggestions:v1:'
  private readonly STATS_KEY = 'search:suggestions:stats:v1'
  private readonly POPULAR_KEY = 'search:suggestions:popular:v1'
  private readonly MIN_PREFIX_LENGTH = 2
  private readonly REDIS_KEY_TTL = 7 * 24 * 60 * 60 // 7 days
  private readonly BATCH_SIZE = 100 // Process scenes in batches
  private readonly MIN_OCCURRENCE_THRESHOLD = 5 // Minimum scenes for a term to be indexed
  private readonly MAX_SUGGESTIONS_PER_PREFIX = 30 // Reduced from 50

  private readonly STOP_WORDS = new Set([
    'the',
    'is',
    'at',
    'which',
    'on',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'with',
    'to',
    'for',
    'of',
    'as',
    'by',
    'this',
    'that',
    'it',
    'from',
    'be',
    'are',
    'was',
    'were',
    'been',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'can',
    'am',
    'been',
    'being',
    'about',
    'after',
    'all',
    'also',
    'any',
  ])

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.debug('Search suggestion cache already initialized')
      return
    }

    if (this.initializationPromise) {
      return this.initializationPromise
    }

    this.initializationPromise = this.doInitialize()
    return this.initializationPromise
  }

  private async doInitialize(): Promise<void> {
    try {
      const stats = await getCache<CacheStats>(this.STATS_KEY)

      if (stats?.isInitialized) {
        const cacheAge = Date.now() - new Date(stats.lastBuilt).getTime()
        const maxAge = 24 * 60 * 60 * 1000 // 24 hours

        if (cacheAge < maxAge) {
          this.isInitialized = true
          return
        }
      }

      await this.buildCache()
      this.isInitialized = true
    } finally {
      this.initializationPromise = null
    }
  }

  private async buildCache(): Promise<void> {
    const startTime = Date.now()
    const faceCounts = new Map<string, number>()
    const objectCounts = new Map<string, number>()
    const emotionCounts = new Map<string, number>()
    const cameraCounts = new Map<string, number>()
    const shotTypeCounts = new Map<string, number>()
    const locationCounts = new Map<string, number>()
    const transcriptionTerms = new Map<string, number>()
    const textTerms = new Map<string, number>()
    let totalScenes: number = 0;

    for await (const scene of getScenesStream(this.BATCH_SIZE)) {
      this.extractArray(scene.faces, faceCounts)
      this.extractArray(scene.objects, objectCounts)
      this.extractEmotions(scene.emotions, emotionCounts)
      totalScenes += 1;

      if (scene.camera) {
        const camera = scene.camera.toString()
        cameraCounts.set(camera, (cameraCounts.get(camera) || 0) + 1)
      }
      if (scene.location) {
        const location = scene.location.toString()
        locationCounts.set(location, (locationCounts.get(location) || 0) + 1)
      }

      if (scene.shotType) {
        const shotType = scene.shotType.toString()
        shotTypeCounts.set(shotType, (shotTypeCounts.get(shotType) || 0) + 1)
      }

      if (scene.transcription) {
        this.extractWords(scene.transcription.toString(), transcriptionTerms, 3)
      }

      if (scene.detectedText) {
        this.extractWords(scene.detectedText.toString(), textTerms, 3)
      }
    }

    // Filter out low-frequency terms to reduce cache size
    const filterLowFrequency = (map: Map<string, number>) => {
      const filtered = new Map<string, number>()
      map.forEach((count, term) => {
        if (count >= this.MIN_OCCURRENCE_THRESHOLD) {
          filtered.set(term, count)
        }
      })
      return filtered
    }

    const filteredTranscriptionTerms = filterLowFrequency(transcriptionTerms)
    const filteredTextTerms = filterLowFrequency(textTerms)

    const allPrefixSuggestions = new Map<string, Suggestion[]>()

    this.collectTermsIntoMap(faceCounts, 'face', allPrefixSuggestions)
    this.collectTermsIntoMap(objectCounts, 'object', allPrefixSuggestions)
    this.collectTermsIntoMap(emotionCounts, 'emotion', allPrefixSuggestions)
    this.collectTermsIntoMap(cameraCounts, 'camera', allPrefixSuggestions)
    this.collectTermsIntoMap(shotTypeCounts, 'shotType', allPrefixSuggestions)
    this.collectTermsIntoMap(locationCounts, 'location', allPrefixSuggestions)
    this.collectTermsIntoMapWithLimit(filteredTranscriptionTerms, 'transcription', 5000, allPrefixSuggestions)
    this.collectTermsIntoMapWithLimit(filteredTextTerms, 'text', 2000, allPrefixSuggestions)

    await this.writeAllSuggestionsToCache(allPrefixSuggestions)

    // Store popular suggestions for quick access
    await this.storePopularSuggestions({
      faces: faceCounts,
      objects: objectCounts,
      emotions: emotionCounts,
      cameras: cameraCounts,
      shotTypes: shotTypeCounts,
    })

    // Store stats
    const stats: CacheStats = {
      isInitialized: true,
      lastBuilt: new Date().toISOString(),
      totalTerms:
        faceCounts.size +
        objectCounts.size +
        emotionCounts.size +
        cameraCounts.size +
        shotTypeCounts.size +
        locationCounts.size +
        filteredTranscriptionTerms.size +
        filteredTextTerms.size,
      totalScenes,
      facesCount: faceCounts.size,
      objectsCount: objectCounts.size,
      emotionsCount: emotionCounts.size,
      camerasCount: cameraCounts.size,
      shotTypesCount: shotTypeCounts.size,
      transcriptionTermsCount: filteredTranscriptionTerms.size,
      textTermsCount: filteredTextTerms.size,
    }

    await setCache(this.STATS_KEY, stats, this.REDIS_KEY_TTL)

    const duration = Date.now() - startTime
    logger.debug(`Search suggestion cache built successfully in ${duration}ms`)
  }

  private collectTermsIntoMap(
    counts: Map<string, number>,
    type: Suggestion['type'],
    allPrefixSuggestions: Map<string, Suggestion[]>
  ): void {
    if (counts.size === 0) return

    const total = Array.from(counts.values()).reduce((a, b) => a + b, 0)

    for (const [term, count] of counts.entries()) {
      const frequency = count / total
      const lengthBonus = Math.min(term.length / 20, 1)
      const popularityBoost = Math.log10(count + 1) * 10
      const score = frequency * 100 + popularityBoost + lengthBonus * 5

      const words = term.split(/[\s,]+/)
      words.forEach((word) => {
        const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '')
        for (let i = this.MIN_PREFIX_LENGTH; i <= Math.min(cleanWord.length, 10); i++) {
          const prefix = cleanWord.substring(0, i).toLowerCase()

          if (!allPrefixSuggestions.has(prefix)) {
            allPrefixSuggestions.set(prefix, [])
          }

          allPrefixSuggestions.get(prefix)!.push({
            text: term,
            type,
            count: score,
            sceneCount: count,
          })
        }
      })
    }
  }

  private collectTermsIntoMapWithLimit(
    counts: Map<string, number>,
    type: Suggestion['type'],
    maxTerms: number,
    allPrefixSuggestions: Map<string, Suggestion[]>
  ): void {
    if (counts.size === 0) return

    // Sort by count and take only top terms
    const sortedTerms = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxTerms)

    const limitedMap = new Map(sortedTerms)
    this.collectTermsIntoMap(limitedMap, type, allPrefixSuggestions)
  }

  private async writeAllSuggestionsToCache(allPrefixSuggestions: Map<string, Suggestion[]>): Promise<void> {
    const cachePromises: Promise<void>[] = []

    for (const [prefix, suggestions] of allPrefixSuggestions.entries()) {
      // Sort by score and limit
      suggestions.sort((a, b) => b.count - a.count)
      const topSuggestions = suggestions.slice(0, this.MAX_SUGGESTIONS_PER_PREFIX)

      const key = `${this.CACHE_PREFIX}${prefix}`
      cachePromises.push(setCache(key, topSuggestions, this.REDIS_KEY_TTL))

      // Batch Redis operations
      if (cachePromises.length >= 100) {
        await Promise.all(cachePromises)
        cachePromises.length = 0
      }
    }

    // Complete remaining operations
    if (cachePromises.length > 0) {
      await Promise.all(cachePromises)
    }

    logger.debug(`Wrote ${allPrefixSuggestions.size} prefix keys to cache`)
  }

  private extractArray(value: unknown, counts: Map<string, number>): void {
    if (!value) return

    const items = Array.isArray(value) ? value : [value]
    items.forEach((item) => {
      if (item && typeof item === 'string' && item.length >= 2 && !item.toLowerCase().includes('unknown')) {
        const normalized = item.trim()
        counts.set(normalized, (counts.get(normalized) || 0) + 1)
      }
    })
  }

  private extractEmotions(emotions: unknown, counts: Map<string, number>): void {
    if (!emotions) return

    const emotionList = Array.isArray(emotions) ? emotions : [emotions]
    emotionList.forEach((emotion) => {
      if (emotion && typeof emotion === 'object' && emotion.emotion) {
        const emotionText = emotion.emotion.toString().trim()
        if (emotionText && emotionText.length >= 2) {
          counts.set(emotionText, (counts.get(emotionText) || 0) + 1)
        }
      } else if (typeof emotion === 'string') {
        const emotionText = emotion.trim()
        if (emotionText && emotionText.length >= 2) {
          counts.set(emotionText, (counts.get(emotionText) || 0) + 1)
        }
      }
    })
  }

  private extractWords(text: string, counts: Map<string, number>, minLength = 3): void {
    // Split on word boundaries and clean
    const words = text
      .toLowerCase()
      .split(/[\s\-_,.!?;:()[\]{}'"]+/)
      .filter((word) => word.length >= minLength)

    words.forEach((word) => {
      // Skip stop words and numbers
      if (this.STOP_WORDS.has(word) || /^\d+$/.test(word)) return

      counts.set(word, (counts.get(word) || 0) + 1)
    })
  }

  private async indexTerms(counts: Map<string, number>, type: Suggestion['type']): Promise<void> {
    if (counts.size === 0) return

    const total = Array.from(counts.values()).reduce((a, b) => a + b, 0)
    const terms: Array<{ term: string; count: number; score: number }> = []

    for (const [term, count] of counts.entries()) {
      const frequency = count / total
      const lengthBonus = Math.min(term.length / 20, 1)
      const popularityBoost = Math.log10(count + 1) * 10

      // Enhanced scoring for better ranking
      const score = frequency * 100 + popularityBoost + lengthBonus * 5

      terms.push({ term, count, score })
    }

    // Sort by score and take top terms
    terms.sort((a, b) => b.score - a.score)

    // Index using prefix matching
    const prefixMap = new Map<string, Suggestion[]>()

    terms.forEach(({ term, count, score }) => {
      const words = term.split(/[\s,]+/)
      words.forEach((word) => {
        const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '')
        for (let i = this.MIN_PREFIX_LENGTH; i <= Math.min(cleanWord.length, 10); i++) {
          const prefix = cleanWord.substring(0, i).toLowerCase()
          if (!prefixMap.has(prefix)) prefixMap.set(prefix, [])

          prefixMap.get(prefix)!.push({
            text: term,
            type,
            count: score,
            sceneCount: count,
          })
        }
      })
    })

    // Store in Redis with batching
    const cachePromises: Promise<void>[] = []

    for (const [prefix, suggestions] of prefixMap.entries()) {
      // Sort and limit suggestions per prefix
      suggestions.sort((a, b) => b.count - a.count)
      const topSuggestions = suggestions.slice(0, this.MAX_SUGGESTIONS_PER_PREFIX)

      const key = `${this.CACHE_PREFIX}${prefix}`
      cachePromises.push(setCache(key, topSuggestions, this.REDIS_KEY_TTL))

      // Batch Redis operations
      if (cachePromises.length >= 100) {
        await Promise.all(cachePromises)
        cachePromises.length = 0
      }
    }

    // Complete remaining operations
    if (cachePromises.length > 0) {
      await Promise.all(cachePromises)
    }
  }

  private async storePopularSuggestions(data: {
    faces: Map<string, number>
    objects: Map<string, number>
    emotions: Map<string, number>
    cameras: Map<string, number>
    shotTypes: Map<string, number>
  }): Promise<void> {
    const popular = {
      face: this.getTopTerms(data.faces, 20),
      object: this.getTopTerms(data.objects, 20),
      emotion: this.getTopTerms(data.emotions, 15),
      camera: this.getTopTerms(data.cameras, 10),
      shotType: this.getTopTerms(data.shotTypes, 10),
    }

    await setCache(this.POPULAR_KEY, popular, this.REDIS_KEY_TTL)
  }

  private getTopTerms(counts: Map<string, number>, limit: number): Suggestion[] {
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([text, count]) => ({
        text,
        type: 'face' as const,
        count,
        sceneCount: count,
      }))
  }

  async getSuggestions(query: string, limit = 10, type?: Suggestion['type']): Promise<Suggestion[]> {
    if (query.length < this.MIN_PREFIX_LENGTH) {
      return []
    }

    const normalized = query.toLowerCase().trim()
    const key = type ? `${this.CACHE_PREFIX}${normalized}:${type}` : `${this.CACHE_PREFIX}${normalized}`

    let results = (await getCache<Suggestion[]>(key)) || []

    // Fuzzy matching for better results
    if (results.length < limit && normalized.length >= this.MIN_PREFIX_LENGTH) {
      const fuzzyResults = await this.getFuzzyMatches(normalized, limit - results.length)
      results = [...results, ...fuzzyResults]
    }

    // Deduplicate and limit
    const seen = new Set<string>()
    const suggestions: Suggestion[] = []

    for (const s of results) {
      const key = `${s.type}:${s.text}`
      if (!seen.has(key)) {
        seen.add(key)
        suggestions.push(s)
        if (suggestions.length >= limit) break
      }
    }

    return suggestions
  }

  private async getFuzzyMatches(query: string, limit: number): Promise<Suggestion[]> {
    const results: Suggestion[] = []

    const variations = [query.slice(0, -1), query.slice(1), query]

    for (const variation of variations) {
      if (variation.length >= this.MIN_PREFIX_LENGTH) {
        const key = `${this.CACHE_PREFIX}${variation}`
        const matches = (await getCache<Suggestion[]>(key)) || []
        results.push(...matches.filter((m) => m.text.toLowerCase().includes(query)))
      }
    }

    return results.slice(0, limit)
  }

  async getGroupedSuggestions(query: string, limitPerGroup = 5, totalLimit = 30): Promise<GroupedSuggestions> {
    const suggestions = await this.getSuggestions(query, totalLimit)

    const grouped: GroupedSuggestions = {
      face: [],
      object: [],
      emotion: [],
      camera: [],
      shotType: [],
      location: [],
      transcription: [],
      text: [],
    }

    suggestions.forEach((s) => {
      if (grouped[s.type]) {
        grouped[s.type].push(s)
      }
    })

    Object.keys(grouped).forEach((k) => {
      if (!grouped[k].length) {
        delete grouped[k]
      } else {
        grouped[k] = grouped[k].slice(0, limitPerGroup)
      }
    })

    return grouped
  }

  async getPopularSuggestions(limit = 20): Promise<Suggestion[]> {
    const popular = await getCache<Record<string, Suggestion[]>>(this.POPULAR_KEY)
    if (!popular) return []

    const allPopular: Suggestion[] = []
    Object.values(popular).forEach((suggestions) => {
      allPopular.push(...suggestions)
    })

    return allPopular.slice(0, limit)
  }

  async getSuggestionsByType(query: string, type: Suggestion['type'], limit = 5): Promise<Suggestion[]> {
    const allSuggestions = await this.getSuggestions(query, limit * 5, type)
    return allSuggestions.filter((s) => s.type === type).slice(0, limit)
  }

  async getStats(): Promise<CacheStats | null> {
    return getCache<CacheStats>(this.STATS_KEY)
  }

  async refresh(): Promise<void> {
    await invalidateCache(`${this.CACHE_PREFIX}*`)
    await invalidateCache(this.STATS_KEY)
    await invalidateCache(this.POPULAR_KEY)
    this.isInitialized = false
    this.initializationPromise = null
    await this.buildCache()
  }

  async clear(): Promise<void> {
    await invalidateCache(`${this.CACHE_PREFIX}*`)
    await invalidateCache(this.STATS_KEY)
    await invalidateCache(this.POPULAR_KEY)
    this.isInitialized = false
    this.initializationPromise = null
  }
}

const suggestionCache = new SearchSuggestionCache()

export async function initializeSuggestionCache(): Promise<void> {
  await suggestionCache.initialize()
}

export async function getSearchSuggestions(query: string, limit?: number) {
  return suggestionCache.getSuggestions(query, limit)
}

export async function getGroupedSearchSuggestions(query: string, limitPerGroup?: number, totalLimit?: number) {
  return suggestionCache.getGroupedSuggestions(query, limitPerGroup, totalLimit)
}

export async function getPopularSuggestions(limit?: number) {
  return suggestionCache.getPopularSuggestions(limit)
}

export async function getSuggestionsByType(query: string, type: Suggestion['type'], limit?: number) {
  return suggestionCache.getSuggestionsByType(query, type, limit)
}

export async function getSuggestionStats() {
  return suggestionCache.getStats()
}

export async function refreshSuggestionCache(): Promise<void> {
  await suggestionCache.refresh()
}

export function buildSearchQueryFromSuggestions(
  suggestions: Record<string, string | null | undefined>
): VideoSearchParams {
  const searchQuery: VideoSearchParams = VideoSearchParamsSchema.parse({})

  const typeMapping: Record<string, keyof VideoSearchParams> = {
    face: 'faces',
    emotion: 'emotions',
    shotType: 'shotType',
    object: 'objects',
    camera: 'camera',
    transcription: 'transcriptionQuery',
    text: 'detectedText',
    location: 'locations',
    semanticQuery: 'semanticQuery',
  }

  for (const [type, value] of Object.entries(suggestions)) {
    const field = typeMapping[type]

    if (!field || !value) continue

    switch (field) {
      case 'faces':
      case 'emotions':
      case 'objects':
      case 'locations':
        searchQuery[field] = [value]
        break

      case 'shotType':
        searchQuery[field] = value as ShotType
        break

      case 'camera':
      case 'transcriptionQuery':
      case 'detectedText':
        searchQuery[field] = value
        break
      case 'semanticQuery':
        searchQuery[field] = value
        break
    }
  }

  return searchQuery
}

export { suggestionCache }
