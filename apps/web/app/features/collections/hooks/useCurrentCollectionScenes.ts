import { useEffect } from 'react'
import { useCollectionsStore } from '../stores'
import { useParams } from 'react-router'

export function useCurrentCollectionScenes() {
  const { id } = useParams()

  const {
    currentCollection,
    isLoading,
    fetchCollectionScenes,
    clearCurrentCollection,
    currentScenes,
    exportCollectionSelectedScenes,
  } = useCollectionsStore()

  useEffect(() => {
    if (id) {
      fetchCollectionScenes(id)
    }
    return () => clearCurrentCollection()
  }, [id, fetchCollectionScenes, clearCurrentCollection])

  return {
    currentCollection,
    loading: isLoading,
    fetchCollectionScenes,
    clearCurrentCollection,
    currentScenes,
    exportCollectionSelectedScenes,
    id
  }
}
