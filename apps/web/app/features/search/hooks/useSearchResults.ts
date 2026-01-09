import { useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { useSearchStore } from '~/features/search/stores'

export function useSearchResults() {
  const [searchParams, setSearchParams] = useSearchParams()

  const {
    query,
    filters,
    searchMode,
    imageSearch,
    results,
    pagination,
    resultsLoading,
    performSearch,
    addFilter,
    setQuery,
    imagePreview,
    setShowSuggestions,
    showSuggestions,
    suggestionsLoading,
    clearResults,
    clearAllFilters,
    clearSearch,
  } = useSearchStore()
  const hasQuery = query.trim().length > 0 || Object.keys(filters).length > 0 || !!imagePreview

  useEffect(() => {
    const hasQuery = query.trim().length > 0
    const hasFilters = Object.keys(filters).length > 0
    const hasImage = imageSearch !== null

    if (!hasQuery && !hasFilters && !hasImage) {
      return
    }

    if (suggestionsLoading) {
      return
    }

    const timeout = setTimeout(() => {
      performSearch()
    }, 300)

    return () => clearTimeout(timeout)
  }, [query, filters, imageSearch, searchMode, performSearch, suggestionsLoading])

  useEffect(() => {
    if (searchParams.has('face')) {
      for (const item of searchParams.get('face')?.toString().split(',') || []) {
        addFilter('face', item)
      }
    }
    if (searchParams.has('transcription')) {
      for (const item of searchParams.get('transcription')?.toString().split(',') || []) {
        addFilter('transcription', item)
      }
    }
    if (searchParams.has('text')) {
      for (const item of searchParams.get('text')?.toString().split(',') || []) {
        addFilter('text', item)
      }
    }
    const urlQuery = searchParams.get('q')
    if (urlQuery && urlQuery !== query) {
      setQuery(urlQuery)
    }
    return () => {
      clearResults()
      clearAllFilters()
      clearSearch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const params = new URLSearchParams()

    if (query.trim()) {
      params.set('q', query.trim())
    }

    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value) && value.length > 0) {
        params.set(key, value.join(','))
      } else if (typeof value === 'string' && value) {
        params.set(key, value)
      }
    })

    setSearchParams(params, { replace: true })
  }, [query, filters, setSearchParams])

  return {
    results,
    total: pagination?.total ?? 0,
    page: pagination?.page ?? 1,
    hasMore: pagination?.hasMore ?? false,
    isLoading: resultsLoading,
    reload: performSearch,
    addFilter,
    hasQuery,
    setShowSuggestions,
    showSuggestions,
    searchMode,
  }
}
