import { useEffect } from 'react'
import { useJobsStore } from '../stores'
import { useParams } from 'react-router'

export const useJob = () => {
    const { id } = useParams()

    const { fetchJobById, clearError, isLoading, currentJob, retryJob, deleteJob, clearCurrentJob, error, } = useJobsStore()

    useEffect(() => {
        if (id) {
            fetchJobById(id)
        }
        return () => {
            clearCurrentJob()
        }
    }, [id, clearCurrentJob, fetchJobById])

    return {
        fetchJobById,
        clearError,
        loading: isLoading,
        currentJob,
        retryJob,
        deleteJob,
        error
    }
}
