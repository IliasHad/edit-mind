import { logger } from './logger'
import { getCache, setCache, invalidateCache } from './cache'
import { VideoSearchParams } from '../types/search'
import { ShotType } from '../types'
import { VideoSearchParamsSchema } from '@shared/schemas/search'
// import { getAllDocs } from '@vector/services/vectorDb'

export interface Suggestion {
  text: string
  type: 'face' | 'object' | 'emotion' | 'camera' | 'shot_type' | 'location' | 'transcription' | 'text'
  count: number
}

export interface GroupedSuggestions {
  [key: string]: Suggestion[]
}

class SearchSuggestionCache {
  private isInitialized = false
  private readonly CACHE_PREFIX = 'search:suggestions:cache:'
  private readonly STATS_KEY = 'search:suggestions:stats'
  private readonly MIN_PREFIX_LENGTH = 2
  private readonly REDIS_KEY_TTL = 7 * 24 * 60 * 60 // 7 days in seconds

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
  ])

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.debug('Search suggestion cache already initialized')
      return
    }

    await this.buildCache()
    this.isInitialized = true
  }

  private async buildCache(): Promise<void> {
    logger.debug('Building search suggestion cache...')

    // const allDocs = await getAllDocs()

    const faceCounts = new Map<string, number>()
    const objectCounts = new Map<string, number>()
    const emotionCounts = new Map<string, number>()
    const cameraCounts = new Map<string, number>()
    const shotTypeCounts = new Map<string, number>()
    const locationCounts = new Map<string, number>()
    const transcriptionTerms = new Map<string, number>()
    const textTerms = new Map<string, number>()

    // allDocs?.forEach((metadata) => {
    //   if (!metadata) return

    //   this.extractArray(metadata.faces, faceCounts)
    //   this.extractArray(metadata.objects, objectCounts)
    //   this.extractArray(
    //     metadata.emotions.map((emotion) => emotion.emotion),
    //     emotionCounts
    //   )

    //   if (metadata.camera) {
    //     const camera = metadata.camera.toString()
    //     cameraCounts.set(camera, (cameraCounts.get(camera) || 0) + 1)
    //   }

    //   if (metadata.shot_type) {
    //     const shotType = metadata.shot_type.toString()
    //     shotTypeCounts.set(shotType, (shotTypeCounts.get(shotType) || 0) + 1)
    //   }

    //   if (metadata.transcription) {
    //     this.extractWords(metadata.transcription.toString(), transcriptionTerms, 3)
    //   }

    //   if (metadata.detectedText) {
    //     this.extractWords(metadata.detectedText.toString(), textTerms, 3)
    //   }
    // })

    await this.indexTerms(faceCounts, 'face')
    await this.indexTerms(objectCounts, 'object')
    await this.indexTerms(emotionCounts, 'emotion')
    await this.indexTerms(cameraCounts, 'camera')
    await this.indexTerms(shotTypeCounts, 'shot_type')
    await this.indexTerms(locationCounts, 'location')
    await this.indexTerms(transcriptionTerms, 'transcription')
    await this.indexTerms(textTerms, 'text')

    await setCache(
      this.STATS_KEY,
      {
        isInitialized: true,
        lastBuilt: new Date().toISOString(),
        totalTerms:
          faceCounts.size +
          objectCounts.size +
          emotionCounts.size +
          cameraCounts.size +
          shotTypeCounts.size +
          locationCounts.size +
          transcriptionTerms.size +
          textTerms.size,
      },
      this.REDIS_KEY_TTL
    )

    logger.debug('Search suggestion cache built successfully')
  }

  private extractArray(value: string[], counts: Map<string, number>): void {
    if (!value) return
    const items = Array.isArray(value) ? value : [value]
    items.forEach((item) => {
      if (item && item.length >= 2 && !item.includes('unknown')) {
        counts.set(item, (counts.get(item) || 0) + 1)
      }
    })
  }

  private extractWords(text: string, counts: Map<string, number>, minLength = 3): void {
    const words = text.split(/\s+/).filter((word) => word.length >= minLength)
    words.forEach((word) => {
      if (word.length >= minLength && !this.STOP_WORDS.has(word)) {
        counts.set(word, (counts.get(word) || 0) + 1)
      }
    })
  }

  private async indexTerms(counts: Map<string, number>, type: Suggestion['type']): Promise<void> {
    if (counts.size === 0) return

    const total = Array.from(counts.values()).reduce((a, b) => a + b, 0)

    for (const [term, count] of counts.entries()) {
      const frequency = count / total
      const lengthBonus = Math.min(term.length / 20, 1)

      const score = frequency * 100 + Math.log10(count + 1) * 10 + lengthBonus * 5

      const prefix = term
      const key = `${this.CACHE_PREFIX}${prefix}`

      const existing = (await getCache<Suggestion[]>(key)) || []
      existing.push({ text: term, type, count: score })
      existing.sort((a, b) => b.count - a.count) // sort by score descending

      await setCache(key, existing.slice(0, 50), this.REDIS_KEY_TTL) // store top 50 suggestions per prefix
    }
  }

  async getSuggestions(query: string, limit = 8): Promise<Suggestion[]> {
    if (!this.isInitialized || query.length < this.MIN_PREFIX_LENGTH) return []

    const normalized = query

    const key = `${this.CACHE_PREFIX}${normalized}`
    const results = (await getCache<Suggestion[]>(key)) || []

    if (results.length < limit && normalized.length >= 3) {
      const fuzzyKeys = [normalized.slice(0, -1), normalized.slice(1)]
      for (const fk of fuzzyKeys) {
        if (fk.length >= this.MIN_PREFIX_LENGTH) {
          const fuzzyResults = (await getCache<Suggestion[]>(`${this.CACHE_PREFIX}${fk}`)) || []
          results.push(...fuzzyResults)
        }
      }
    }

    const seen = new Set<string>()
    const suggestions: Suggestion[] = []
    for (const s of results) {
      if (!seen.has(s.text)) {
        seen.add(s.text)
        suggestions.push(s)
        if (suggestions.length >= limit) break
      }
    }

    return suggestions
  }

  async getGroupedSuggestions(query: string, limitPerGroup = 3, totalLimit = 20): Promise<GroupedSuggestions> {
    const suggestions = await this.getSuggestions(query, totalLimit)
    const grouped: GroupedSuggestions = {
      face: [],
      object: [],
      emotion: [],
      camera: [],
      shot_type: [],
      location: [],
      transcription: [],
      text: [],
    }

    suggestions.forEach((s) => grouped[s.type]?.push(s))
    Object.keys(grouped).forEach((k) => {
      if (!grouped[k].length) delete grouped[k]
      else grouped[k] = grouped[k].slice(0, limitPerGroup)
    })

    return grouped
  }

  async getSuggestionsByType(query: string, type: Suggestion['type'], limit = 5): Promise<Suggestion[]> {
    const allSuggestions = await this.getSuggestions(query, limit * 5)
    return allSuggestions.filter((s) => s.type === type).slice(0, limit)
  }

  async refresh(): Promise<void> {
    logger.debug('Refreshing search suggestion cache...')
    await invalidateCache(`${this.CACHE_PREFIX}*`)
    await invalidateCache(this.STATS_KEY)
    this.isInitialized = false
    await this.initialize()
  }

  async clear(): Promise<void> {
    await invalidateCache(`${this.CACHE_PREFIX}*`)
    await invalidateCache(this.STATS_KEY)
    this.isInitialized = false
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

export async function getSuggestionsByType(query: string, type: Suggestion['type'], limit?: number) {
  return suggestionCache.getSuggestionsByType(query, type, limit)
}

export async function refreshSuggestionCache(): Promise<void> {
  await suggestionCache.refresh()
}

export function buildSearchQueryFromSuggestions(suggestions: Record<string, string>): VideoSearchParams {
  const searchQuery: VideoSearchParams = VideoSearchParamsSchema.parse({})

  const typeMapping: Record<string, keyof VideoSearchParams> = {
    face: 'faces',
    emotion: 'emotions',
    shot_type: 'shot_type',
    object: 'objects',
    camera: 'camera',
    transcription: 'transcriptionQuery',
    text: 'detectedText',
    location: 'locations',
  }

  for (const [type, value] of Object.entries(suggestions)) {
    const field = typeMapping[type]

    if (!field || !value) continue

    switch (field) {
      case 'faces':
      case 'emotions':
      case 'objects':
      case 'locations':
        searchQuery[field] = value
          .split(',')
          .map((v) => v)
          .filter((v) => v)
        break

      case 'shot_type':
        searchQuery[field] = value as ShotType
        break

      case 'camera':
      case 'transcriptionQuery':
      case 'detectedText':
        searchQuery[field] = value
        break
    }
  }

  return searchQuery
}

export { suggestionCache }
