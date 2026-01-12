import type { VideoWithScenesAndMatch } from '@shared/types/video'
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { GroupedSuggestions } from '@search/services/suggestion'

export interface SearchFilters {
  face?: string[]
  object?: string[]
  emotion?: string[]
  camera?: string[]
  shotType?: string[]
  transcription?: string
  text?: string
  location?: string[]
}

interface PaginationInfo {
  total: number
  page: number
  limit: number
  hasMore: boolean
}

interface SearchState {
  // Search Query & Filters
  query: string
  filters: SearchFilters
  searchMode: 'text' | 'image'

  // Image Search
  imageSearch: File | null
  imagePreview: string | null

  // Results
  results: VideoWithScenesAndMatch[]
  resultsLoading: boolean
  resultsError: string | null
  pagination: PaginationInfo | null

  // Suggestions
  suggestions: GroupedSuggestions
  suggestionsLoading: boolean
  suggestionsError: string | null
  suggestionsLastFetched: number | null
  showSuggestions: boolean
  recentSearches: string[]

  // Actions - Query & Filters
  setQuery: (query: string) => void
  setFilters: (filters: SearchFilters) => void
  addFilter: (type: keyof SearchFilters, value: string) => void
  removeFilter: (type: keyof SearchFilters, value: string) => void
  clearFilter: (type: keyof SearchFilters) => void
  clearAllFilters: () => void

  // Actions - Search Mode
  setSearchMode: (mode: 'text' | 'image') => void
  setImageSearch: (file: File | null, preview: string | null) => void

  // Actions - Results
  performSearch: (options?: { page?: number; limit?: number }) => Promise<void>
  setResults: (results: VideoWithScenesAndMatch[], pagination: PaginationInfo) => void
  clearResults: () => void
  setResultsLoading: (loading: boolean) => void
  clearResultsError: () => void

  // Actions - Suggestions
  fetchSuggestions: (query: string, force?: boolean) => Promise<void>
  clearSuggestions: () => void
  setShowSuggestions: (show: boolean) => void
  addRecentSearch: (search: string) => void
  clearRecentSearches: () => void
  clearSuggestionsError: () => void
  invalidateSuggestions: () => void

  // Actions - Utility
  clearSearch: () => void
  reset: () => void

  clearQuery: () => void
}

const SUGGESTIONS_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const MIN_QUERY_LENGTH = 2

const initialState = {
  query: '',
  filters: {},
  searchMode: 'text' as const,
  imageSearch: null,
  imagePreview: null,
  results: [],
  resultsLoading: false,
  resultsError: null,
  pagination: null,
  suggestions: {},
  suggestionsLoading: false,
  suggestionsError: null,
  suggestionsLastFetched: null,
  showSuggestions: false,
  recentSearches: [],
}

// API utility functions
const apiClient = {
  async request<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText)
      throw new Error(`API Error (${response.status}): ${errorText}`)
    }

    return response.json()
  },

  search: {
    text: (params: { query?: string; filters?: SearchFilters; page?: number; limit?: number }) => {
      const formData = new FormData()

      if (params.query) {
        formData.append('query', params.query)
      }

      if (params.filters) {
        Object.entries(params.filters).forEach(([key, value]) => {
          if (Array.isArray(value) && value.length > 0) {
            formData.append(key, value.join(','))
          } else if (typeof value === 'string' && value) {
            formData.append(key, value)
          }
        })
      }

      if (params.page) {
        formData.append('page', params.page.toString())
      }

      if (params.limit) {
        formData.append('limit', params.limit.toString())
      }

      return apiClient.request<{
        videos: VideoWithScenesAndMatch[]
        total: number
        page: number
        limit: number
        hasMore: boolean
      }>('/api/search', {
        method: 'POST',
        body: formData,
      })
    },

    image: (params: { image: File; query?: string; filters?: SearchFilters; page?: number; limit?: number }) => {
      const formData = new FormData()
      formData.append('image', params.image)

      if (params.query) {
        formData.append('query', params.query)
      }

      if (params.filters) {
        Object.entries(params.filters).forEach(([key, value]) => {
          if (Array.isArray(value) && value.length > 0) {
            formData.append(key, value.join(','))
          } else if (typeof value === 'string' && value) {
            formData.append(key, value)
          }
        })
      }

      if (params.page) {
        formData.append('page', params.page.toString())
      }

      if (params.limit) {
        formData.append('limit', params.limit.toString())
      }

      const searchParams = new URLSearchParams()
      searchParams.set('fileName', params.image.name)

      return apiClient.request<{
        videos: VideoWithScenesAndMatch[]
        total: number
        page: number
        limit: number
        hasMore: boolean
      }>(`/api/search/image?${searchParams}`, {
        method: 'POST',
        body: formData,
      })
    },

    suggestions: (params: { query: string; limitPerGroup?: number; totalLimit?: number }) => {
      const searchParams = new URLSearchParams({
        q: params.query,
        ...(params.limitPerGroup && { limitPerGroup: params.limitPerGroup.toString() }),
        ...(params.totalLimit && { totalLimit: params.totalLimit.toString() }),
      })

      return apiClient.request<{
        suggestions: GroupedSuggestions
      }>(`/api/search/suggestions?${searchParams}`)
    },
  },
}

export const useSearchStore = create<SearchState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Query & Filters
        setQuery: (query) => set({ query }),

        setFilters: (filters) => set({ filters }),

        addFilter: (type, value) =>
          set((state) => {
            const currentValues = state.filters[type]

            if (Array.isArray(currentValues)) {
              if (currentValues.includes(value)) {
                return state
              }
              return {
                filters: {
                  ...state.filters,
                  [type]: [...currentValues, value],
                },
              }
            }

            return {
              filters: {
                ...state.filters,
                [type]: value,
              },
            }
          }),

        removeFilter: (type, value) =>
          set((state) => {
            const currentValues = state.filters[type]

            if (Array.isArray(currentValues)) {
              const filtered = currentValues.filter((v) => v !== value)
              const newFilters = { ...state.filters }

              if (filtered.length === 0) {
                delete newFilters[type]
              } else {
                newFilters[type] = filtered
              }

              return { filters: newFilters }
            }

            const newFilters = { ...state.filters }
            delete newFilters[type]
            return { filters: newFilters }
          }),

        clearFilter: (type) =>
          set((state) => {
            const newFilters = { ...state.filters }
            delete newFilters[type]
            return { filters: newFilters }
          }),

        clearAllFilters: () => set({ filters: {} }),

        // Search Mode
        setSearchMode: (mode) => set({ searchMode: mode }),

        setImageSearch: (file, preview) =>
          set({
            imageSearch: file,
            imagePreview: preview,
          }),

        // Results
        performSearch: async (options = {}) => {
          const { page = 1, limit = 20 } = options
          const state = get()

          if (state.resultsLoading) return

          const hasQuery = state.query.trim().length > 0
          const hasFilters = Object.keys(state.filters).length > 0
          const hasImage = state.imageSearch !== null

          if (!hasQuery && !hasFilters && !hasImage) {
            set({ results: [], pagination: null })
            return
          }

          set({ resultsLoading: true, resultsError: null })

          try {
            let data

            if (state.searchMode === 'image' && state.imageSearch) {
              data = await apiClient.search.image({
                image: state.imageSearch,
                query: hasQuery ? state.query.trim() : undefined,
                filters: state.filters,
                page,
                limit,
              })
            } else {
              data = await apiClient.search.text({
                query: hasQuery ? state.query.trim() : undefined,
                filters: state.filters,
                page,
                limit,
              })
            }

            set({
              results: data.videos,
              pagination: {
                total: data.total,
                page: data.page,
                limit: data.limit,
                hasMore: data.hasMore,
              },
              resultsLoading: false,
            })

            // Add to recent searches if there's a query
            if (hasQuery) {
              get().addRecentSearch(state.query.trim())
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to perform search'
            set({ resultsLoading: false, resultsError: message })
            console.error('Error performing search:', error)
          }
        },

        setResults: (results, pagination) => set({ results, pagination }),

        clearResults: () => set({ results: [], pagination: null }),

        setResultsLoading: (loading) => set({ resultsLoading: loading }),

        clearResultsError: () => set({ resultsError: null }),

        // Suggestions
        fetchSuggestions: async (query, force = false) => {
          const state = get()

          if (state.suggestionsLoading) return

          if (query.length < MIN_QUERY_LENGTH) {
            set({ suggestions: {}, suggestionsLastFetched: null })
            return
          }

          const now = Date.now()
          if (
            !force &&
            state.suggestionsLastFetched &&
            now - state.suggestionsLastFetched < SUGGESTIONS_CACHE_DURATION
          ) {
            return
          }

          set({ suggestionsLoading: true, suggestionsError: null })

          try {
            const data = await apiClient.search.suggestions({
              query,
              limitPerGroup: 5,
              totalLimit: 20,
            })

            set({
              suggestions: data.suggestions,
              suggestionsLoading: false,
              suggestionsLastFetched: Date.now(),
            })
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch suggestions'
            set({ suggestionsLoading: false, suggestionsError: message })
            console.error('Error fetching suggestions:', error)
          }
        },

        clearSuggestions: () =>
          set({
            suggestions: {},
            suggestionsLastFetched: null,
          }),
        clearQuery: () =>
          set({
            query: '',
          }),
        setShowSuggestions: (show) => set({ showSuggestions: show }),

        addRecentSearch: (search) =>
          set((state) => {
            if (!search.trim()) return state

            const filtered = state.recentSearches.filter((s) => s !== search)
            return {
              recentSearches: [search, ...filtered].slice(0, 10),
            }
          }),

        clearRecentSearches: () => set({ recentSearches: [] }),

        clearSuggestionsError: () => set({ suggestionsError: null }),

        invalidateSuggestions: () => set({ suggestionsLastFetched: null }),

        clearSearch: () =>
          set({
            query: '',
            filters: {},
            results: [],
            pagination: null,
            imageSearch: null,
            imagePreview: null,
            resultsLoading: false,
            resultsError: null,
            suggestions: {},
            suggestionsLastFetched: null,
          }),

        reset: () => set(initialState),
      }),
      {
        name: 'search-store',
        partialize: (state) => ({
          recentSearches: state.recentSearches,
        }),
      }
    ),
    { name: 'SearchStore' }
  )
)
