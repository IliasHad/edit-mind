import type { KnownFace } from '@shared/types/face'
import type { UnknownFace } from '@shared/types/unknownFace'

export const apiClient = {
    async request<T>(url: string, options?: RequestInit): Promise<T> {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
            credentials: 'include',
        })

        if (!response.ok) {
            const errorText = await response.text().catch(() => response.statusText)
            throw new Error(`API Error (${response.status}): ${errorText}`)
        }

        return response.json()
    },

    faces: {
        unknown: {
            list: (page: number = 1, limit: number = 40) =>
                apiClient.request<{
                    faces: UnknownFace[]
                    total: number
                    page: number
                    totalPages: number
                    hasMore: boolean
                }>(`/api/faces/unknown?page=${page}&limit=${limit}`),

            delete: (imageFile: string, jsonFile: string) =>
                apiClient.request<{ success: boolean }>('/api/faces/delete', {
                    method: 'DELETE',
                    body: JSON.stringify({ imageFile, jsonFile }),
                }),
        },

        known: {
            list: (page: number = 1, limit: number = 40) =>
                apiClient.request<{
                    faces: KnownFace[]
                    total: number
                    page: number
                    totalPages: number
                    hasMore: boolean
                }>(`/api/faces/known?page=${page}&limit=${limit}`),

            images: (name: string) => apiClient.request<KnownFace>(`/api/faces/${name}/images`),

            rename: (oldName: string, newName: string) =>
                apiClient.request<{ success: boolean; error?: string }>(`/api/faces/${oldName}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ newName: newName.trim() }),
                }),

            delete: (name: string) =>
                apiClient.request<{ success: boolean; error?: string }>(`/api/faces/${name}`, {
                    method: 'DELETE',
                    body: JSON.stringify({ name }),
                }),
        },

        label: (faces: Array<{ jsonFile: string; faceId: string }>, name: string) =>
            apiClient.request<{
                success: boolean
                error?: string
                labeledCount: number
            }>('/api/faces/label', {
                method: 'POST',
                body: JSON.stringify({ faces, name }),
            }),
    },
}
