import { useEffect } from 'react'
import { useFoldersStore } from '../stores'

export const useFolders = () => {
  const { fetchFolders, folders, isLoading, error, createFolder, totalVideos, totalDuration, refreshFolders } =
    useFoldersStore()

  useEffect(() => {
    fetchFolders()
  }, [fetchFolders])

  return {
    fetchFolders,
    folders,
    loading: isLoading,
    error,
    createFolder,
    totalVideos,
    totalDuration,
    refreshFolders,
  }
}
