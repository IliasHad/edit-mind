import { useEffect } from 'react'
import { useCollectionsStore } from '../stores'
import { useParams } from 'react-router'

export function useCurrentCollection() {
  const { id } = useParams()

  const { currentCollection, isLoading, fetchCollectionById, clearCurrentCollection } = useCollectionsStore()

  useEffect(() => {
    if (id) {
      fetchCollectionById(id)
    }
    return () => clearCurrentCollection()
  }, [id, fetchCollectionById, clearCurrentCollection])

  return {
    currentCollection,
    isLoading,
    fetchCollectionById,
    clearCurrentCollection,
  }
}
