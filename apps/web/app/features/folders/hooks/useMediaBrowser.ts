import { useMediaBrowserStore } from '../stores/useMediaBrowserStore'

export const useMediaBrowser = () => {
  const { currentPath, folders, files, isLoading, error, selectedPath, setSelectedPath, navigateToFolder, reset, fetchFolders } =
    useMediaBrowserStore()

  return {
    folders,
    loading: isLoading,
    error,
    currentPath,
    files,
    isLoading,
    selectedPath,
    setSelectedPath,
    navigateToFolder,
    reset,
    fetchFolders
  }
}
