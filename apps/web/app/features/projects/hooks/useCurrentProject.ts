import { useEffect } from 'react'
import { useProjectsStore } from '../stores'
import { useParams } from 'react-router'

export function useCurrentProject() {
  const { id } = useParams()
  const {
    currentProject,
    isLoading,
    error,
    fetchProjectById,
    fetchAvailableVideos,
    availableVideos,
    clearCurrentProject,
    createProject,
    updateProject,
    showSuccess,
    deleteProject
  } = useProjectsStore()

  useEffect(() => {
    if (id && id !== 'new') {
      fetchProjectById(id)
    }
    fetchAvailableVideos()

    return clearCurrentProject
  }, [clearCurrentProject, fetchAvailableVideos, fetchProjectById, id])

  return {
    currentProject,
    loading: isLoading,
    error,
    availableVideos,
    createProject,
    updateProject,
    showSuccess,
    deleteProject
  }
}
