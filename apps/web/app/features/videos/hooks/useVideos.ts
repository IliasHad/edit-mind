import { useVideosStore } from '../stores'

export function useVideos() {
  const { fetchVideos, isLoading, error, videos, currentPagination } = useVideosStore()

  return {
    fetchVideos,
    loading: isLoading,
    error,
    videos,
    currentPagination
  }
}
