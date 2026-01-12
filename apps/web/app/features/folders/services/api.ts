import type { FolderCreateInput, FolderUpdateInput, FolderWithJobs } from '../types'

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

    list: () => apiClient.request<{ folders: FolderWithJobs[] }>('/api/folders'),

    get: (id: string) => apiClient.request<{ folder: FolderWithJobs }>(`/api/folders/${id}`),

    create: (input: FolderCreateInput) =>
        apiClient.request<{ folder: FolderWithJobs }>('/api/folders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(input),
        }),

    update: (id: string, input: FolderUpdateInput) =>
        apiClient.request<{ folder: FolderWithJobs }>(`/api/folders/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(input),
        }),

    delete: (id: string) =>
        apiClient.request<void>(`/api/folders/${id}`, {
            method: 'DELETE',
        }),

    rescan: (id: string) =>
        apiClient.request<{ folder: FolderWithJobs }>(`/api/folders/${id}/rescan`, {
            method: 'POST',
        }),
}
