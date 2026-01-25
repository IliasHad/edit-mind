import { useJobsStore } from '../stores'

export const useJobs = () => {
  const {
    jobs,
    isLoading,
    error,
    totalPages,
    total,
    page,
    limit,
    hasMore,
    jobsStatus,
    fetchJobsByFolderId,
    fetchJobs,
    retryAllFailedJobs,
    refreshJobs,
  } = useJobsStore()

  return {
    jobs,
    loading: isLoading,
    error,
    totalPages,
    total,
    page,
    limit,
    hasMore,
    jobsStatus,
    fetchJobsByFolderId,
    fetchJobs,
    retryAllFailedJobs,
    refreshJobs,
  }
}
