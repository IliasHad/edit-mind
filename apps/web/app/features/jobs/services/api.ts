import type { Job, JobStatus } from '@prisma/client'

export const apiClient = {
  async request<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText)
      throw new Error(`API Error (${response.status}): ${errorText}`)
    }

    return response.json()
  },

  list: () =>
    apiClient.request<{
      jobs: Job[]
      page: number
      limit: number
      total: number
      totalPages: number
      hasMore: boolean
      jobsStatus: Record<JobStatus, number>
    }>('/api/jobs'),
  listByFolderId: (folderId: string) =>
    apiClient.request<{
      jobs: Job[]
      page: number
      limit: number
      total: number
      totalPages: number
      hasMore: boolean
      jobsStatus: Record<JobStatus, number>
    }>(`/api/folders/${folderId}/jobs`),

  get: (id: string) => apiClient.request<{ job: Job }>(`/api/jobs/${id}`),

  delete: (id: string) =>
    apiClient.request<void>(`/api/jobs/${id}`, {
      method: 'DELETE',
    }),
}
