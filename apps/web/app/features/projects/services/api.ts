import type { ProjectCreateInput, ProjectUpdateInput } from '../schemas'
import type { ProjectWithVideosIds } from '../types'

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

    list: () => apiClient.request<{ projects: ProjectWithVideosIds[] }>('/api/projects'),

    get: (id: string) => apiClient.request<{ project: ProjectWithVideosIds }>(`/api/projects/${id}`),

    create: (input: ProjectCreateInput) =>
        apiClient.request<{ project: ProjectWithVideosIds }>('/api/projects', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(input),
        }),

    update: (id: string, input: ProjectUpdateInput) =>
        apiClient.request<{ project: ProjectWithVideosIds }>(`/api/projects/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(input),
        }),

    delete: (id: string) =>
        apiClient.request<void>(`/api/projects/${id}`, {
            method: 'DELETE',
        }),
}
