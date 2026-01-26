import { useEffect } from 'react'
import { useCollectionsStore } from '../stores'
import { useParams, useSearchParams } from 'react-router'
import type { SortOption, SortOrder } from '~/features/videos/types'

export function useCurrentCollection() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()

  const { currentCollection, isLoading, fetchCollectionById, clearCurrentCollection, sortOrder, sortBy } =
    useCollectionsStore()

  useEffect(() => {
    if (id) {
      const sortOption = (searchParams.get('sortBy') as SortOption) || 'shottedAt'
      const sortOrder = (searchParams.get('sortOrder') as SortOrder) || 'desc'

      fetchCollectionById(id, sortOption, sortOrder)
    }
    return () => clearCurrentCollection()
  }, [id, fetchCollectionById, clearCurrentCollection, searchParams])

  return {
    currentCollection,
    loading: isLoading,
    fetchCollectionById,
    clearCurrentCollection,
    sortOrder,
    sortBy,
  }
}
