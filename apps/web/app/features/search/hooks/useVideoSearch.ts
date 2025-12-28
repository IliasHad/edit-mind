import { useState, useEffect, useCallback, useRef } from 'react'
import { useFetcher } from 'react-router-dom'
import lodash from 'lodash'
import type { VideoWithScenes } from '@shared/types/video'
import type { SearchStats } from '@shared/types/search';
import type { Suggestion } from '@search/services/suggestion'

const { debounce } = lodash

interface UseVideoSearchResult {
  query: string
  setQuery: (query: string) => void
  results: VideoWithScenes[]
  stats: SearchStats | null
  isLoading: boolean
  isSearching: boolean
  isError: boolean
  performSearch: () => void
  clearSearch: () => void
  selectedSuggestion: Record<string, string>
  setSelectedSuggestion: (selectedSuggestion: Record<string, string>) => void
  suggestions: Record<string, Suggestion[]>
  showSuggestions: boolean
  setShowSuggestions: (show: boolean) => void
  handleSuggestionSelect: (suggestion: Suggestion) => void
  fetchSuggestions: (q: string) => void
  hasSearched: boolean 
}

export function useVideoSearch(): UseVideoSearchResult {
  const searchFetcher = useFetcher()
  const suggestionFetcher = useFetcher()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<VideoWithScenes[]>([])
  const [stats, setStats] = useState<SearchStats | null>(null)
  const [selectedSuggestion, setSelectedSuggestion] = useState<Record<string, string>>({})
  const [suggestions, setSuggestions] = useState<Record<string, Suggestion[]>>({})
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const lastSearchQueryRef = useRef('')
  const lastSuggestionQueryRef = useRef('')

  const isSearching = searchFetcher.state === 'submitting' || searchFetcher.state === 'loading'
  const isLoading = isSearching
  const isError = searchFetcher.data?.success === false

  useEffect(() => {
    if (searchFetcher.data?.videos) {
      setResults(searchFetcher.data.videos)
      setStats(searchFetcher.data.stats || null)
    }
  }, [searchFetcher.data])

  useEffect(() => {
    if (suggestionFetcher.data?.suggestions) {
      setSuggestions(suggestionFetcher.data.suggestions)
      if (Object.keys(suggestionFetcher.data.suggestions).length > 0) {
        setShowSuggestions(true)
      }
    }
  }, [suggestionFetcher.data])

  const debouncedFetchRef = useRef(
    debounce((q: string, fetcher: ReturnType<typeof useFetcher>) => {
      if (q.length >= 2) {
        fetcher.submit(
          { query: q },
          {
            method: 'post',
            action: '/api/suggestions',
            encType: 'application/json',
          }
        )
      }
    }, 300)
  )

  const fetchSuggestions = useCallback(
    (q: string) => {
      if (lastSuggestionQueryRef.current === q) {
        return
      }

      if (q.length < 2) {
        setSuggestions({})
        setShowSuggestions(false)
        lastSuggestionQueryRef.current = ''
        debouncedFetchRef.current.cancel()
        return
      }

      lastSuggestionQueryRef.current = q
      debouncedFetchRef.current(q, suggestionFetcher)
    },
    [suggestionFetcher]
  )

  const performSearch = useCallback(() => {
    if (!query.trim()) return

    const searchKey = `${query}:${JSON.stringify(selectedSuggestion)}`
    if (lastSearchQueryRef.current === searchKey) {
      return
    }

    if (searchFetcher.state === 'submitting' || searchFetcher.state === 'loading') {
      return
    }

    lastSearchQueryRef.current = searchKey

    const formData = new FormData()
    formData.append('query', query)
    formData.append('suggestions', JSON.stringify(selectedSuggestion))

    searchFetcher.submit(formData, {
      method: 'POST',
      action: '/app/search',
    })

    setHasSearched(true)
    setShowSuggestions(false)
  }, [query, searchFetcher, selectedSuggestion])

  const handleSuggestionSelect = useCallback(
    (suggestion: Suggestion) => {
      setQuery(suggestion.text)
      setShowSuggestions(false)

      const newSuggestions = {
        [suggestion.type]: suggestion.text,
      }
      setSelectedSuggestion(newSuggestions)

      setTimeout(() => {
        const searchKey = `${suggestion.text}:${JSON.stringify(newSuggestions)}`
        lastSearchQueryRef.current = searchKey

        const formData = new FormData()
        formData.append('query', suggestion.text)
        formData.append('suggestions', JSON.stringify(newSuggestions))

        searchFetcher.submit(formData, {
          method: 'POST',
          action: '/app/search',
        })
        setHasSearched(true) 
      }, 100)
    },
    [searchFetcher]
  )

  const clearSearch = useCallback(() => {
    setQuery('')
    setResults([])
    setStats(null)
    setSelectedSuggestion({})
    setSuggestions({})
    setShowSuggestions(false)
    lastSearchQueryRef.current = ''
    lastSuggestionQueryRef.current = ''
    debouncedFetchRef.current.cancel()
    setHasSearched(false) 
  }, [])

  return {
    query,
    setQuery,
    results,
    stats,
    isLoading,
    isSearching,
    isError,
    performSearch,
    clearSearch,
    selectedSuggestion,
    setSelectedSuggestion,
    suggestions,
    showSuggestions,
    setShowSuggestions,
    handleSuggestionSelect,
    fetchSuggestions,
    hasSearched
  }
}
