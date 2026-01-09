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
        fetchJobs
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
        fetchJobs
    }
}
