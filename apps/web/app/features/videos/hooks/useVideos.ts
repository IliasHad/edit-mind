import { useVideosStore } from '../stores'

export function useVideos() {
  const { fetchVideos, isLoading, error, videos, currentPagination, importDemoVideos, importVideoSuccess } = useVideosStore()

  return {
    fetchVideos,
    loading: isLoading,
    error,
    videos,
    currentPagination,
    importDemoVideos,
    importVideoSuccess
  }
}
