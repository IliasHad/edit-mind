import { useEffect } from 'react'
import { useVideosStore } from '../stores'
import { useParams } from 'react-router'

export function useCurrentVideo() {
  const { id } = useParams()

  const {
    currentVideo,
    isLoading,
    fetchVideoById,
    clearCurrentVideo,
    currentScenes,
    isProcessing,
    currentProcessedJob,
    deleteVideoById,
    reindexVideo,
    relinkVideo,
    relinkSuccess,
    videoExist,
    updateVideoLocation,
    addVideoLabels,
    updateLocationSuccess,
    addLabelsSuccess
  } = useVideosStore()

  useEffect(() => {
    if (id) {
      fetchVideoById(id)
    }
    return () => clearCurrentVideo()
  }, [id, fetchVideoById, clearCurrentVideo])

  return {
    currentVideo,
    loading: isLoading,
    fetchVideoById,
    clearCurrentVideo,
    currentScenes,
    isProcessing,
    currentProcessedJob,
    deleteVideoById,
    reindexVideo,
    relinkVideo,
    relinkSuccess,
    videoExist,
    updateVideoLocation,
    addVideoLabels,
    updateLocationSuccess,
    addLabelsSuccess
  }
}
