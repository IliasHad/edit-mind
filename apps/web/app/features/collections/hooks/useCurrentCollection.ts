import { useEffect } from 'react'
import { useCollectionsStore } from '../stores'
import { useParams, useSearchParams } from 'react-router'
import type { SortOption, SortOrder } from '~/features/videos/types'

export function useCurrentCollection() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()

  const { currentCollection, isLoading, fetchCollectionById, clearCurrentCollection, sortOrder, sortBy, error } =
    useCollectionsStore()

  const sortByParam = searchParams.get('sortBy')
  const sortOrderParam = searchParams.get('sortOrder')

  useEffect(() => {
    if (id) {
      const sortOption = (sortByParam as SortOption) || 'shottedAt'
      const order = (sortOrderParam as SortOrder) || 'desc'
      fetchCollectionById(id, sortOption, order)
    }
    return () => clearCurrentCollection()
  }, [id, sortByParam, sortOrderParam, fetchCollectionById, clearCurrentCollection])

  return {
    currentCollection,
    loading: isLoading,
    fetchCollectionById,
    clearCurrentCollection,
    sortOrder,
    sortBy,
    error
  }
}
