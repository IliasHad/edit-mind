import { useEffect } from 'react'
import { useChatStore } from '../stores'

export function useChatSuggestions() {
    const { suggestions, fetchSuggestions, suggestionsLoading } = useChatStore()

    useEffect(() => {
        fetchSuggestions()
    }, [fetchSuggestions])

    return {
        suggestions,
        loading: suggestionsLoading,
    }
}
