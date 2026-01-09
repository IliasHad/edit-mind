import { useEffect, useRef } from 'react'
import { useSearchStore } from '~/features/search/stores'
import { useDebounce } from './useDebounce'

const DEBOUNCE_MS = 300
const MIN_QUERY_LENGTH = 2

export function useSearchSuggestions(enabled: boolean = true) {
  const {
    query,
    suggestions,
    suggestionsLoading,
    fetchSuggestions,
    filters,
    addFilter,
    removeFilter,
    clearSuggestions,
    invalidateSuggestions,
  } = useSearchStore()

  const debouncedQuery = useDebounce(query, DEBOUNCE_MS)
  const lastQueryRef = useRef<string>('')

  useEffect(() => {
    if (!enabled) {
      return
    }

    if (debouncedQuery.length < MIN_QUERY_LENGTH) {
      clearSuggestions()
      return
    }

    // Invalidate cache when query changes to force fresh fetch
    if (lastQueryRef.current !== debouncedQuery) {
      invalidateSuggestions()
      lastQueryRef.current = debouncedQuery
    }

    fetchSuggestions(debouncedQuery, true)
  }, [clearSuggestions, debouncedQuery, enabled, fetchSuggestions, invalidateSuggestions])

  return {
    suggestions,
    isLoading: suggestionsLoading,
    hasSuggestions: Object.keys(suggestions).some((key) => suggestions[key] && suggestions[key].length > 0),
    filters,
    addFilter,
    removeFilter,
  }
}
