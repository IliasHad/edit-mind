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
    clearCurrentProject,
    createProject,
    updateProject,
    showSuccess,
    deleteProject,
  } = useProjectsStore()

  useEffect(() => {
    if (id && id !== 'new') {
      fetchProjectById(id)
    }

    return clearCurrentProject
  }, [clearCurrentProject, fetchProjectById, id])

  return {
    currentProject,
    loading: isLoading,
    error,
    createProject,
    updateProject,
    showSuccess,
    deleteProject,
  }
}
