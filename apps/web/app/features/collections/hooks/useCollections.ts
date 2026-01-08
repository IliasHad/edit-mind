import { useEffect } from 'react'
import { useCollectionsStore } from '../stores'

export function useCollections() {
  const { fetchCollections, collections, totalDuration, totalVideos } = useCollectionsStore()

  useEffect(() => {
    fetchCollections()
  }, [fetchCollections])

  return {
    fetchCollections,
    collections,
    totalDuration,
    totalVideos,
  }
}
