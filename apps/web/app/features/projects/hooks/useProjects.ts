import { useEffect, useCallback } from 'react'
import { useProjectsStore } from '../stores'

export function useProjects() {
  const { projects, isLoading, error, fetchProjects, clearError, refreshProjects } = useProjectsStore()

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const retry = useCallback(() => {
    clearError()
    fetchProjects()
  }, [clearError, fetchProjects])

  return {
    projects,
    isLoading,
    error,
    fetchProjects,
    refreshProjects,
    clearError,
    retry,
    hasProjects: projects.length > 0,
  }
}
