import { useState, useCallback, useEffect } from 'react'
import { useVideos } from '~/features/videos/hooks/useVideos'

export function useInfiniteVideos() {
    const [searchQuery, setSearchQuery] = useState('')
    const { fetchVideos, videos, loading, currentPagination } = useVideos()

    const fetchAvailableVideos = useCallback(
        async (pageNum: number, query: string = '') => {
            try {
                await fetchVideos(pageNum, 20, query)
            } catch (error) {
                console.error('Error fetching videos:', error)
            }
        },
        [fetchVideos]
    )

    const loadMore = useCallback(() => {
        if (!loading && currentPagination?.hasMore) {
            const nextPage = currentPagination.page + 1
            fetchAvailableVideos(nextPage, searchQuery)
        }
    }, [loading, currentPagination?.hasMore, currentPagination?.page, fetchAvailableVideos, searchQuery])

    const reset = useCallback(
        (query: string = '') => {
            setSearchQuery(query)
            fetchAvailableVideos(0, query)
        },
        [fetchAvailableVideos]
    )

    useEffect(() => {
        fetchAvailableVideos(0, searchQuery)
    }, [fetchAvailableVideos, fetchVideos, searchQuery])

    return {
        videos,
        loadMore,
        reset,
        hasMore: currentPagination?.hasMore,
        loading,
    }
}
