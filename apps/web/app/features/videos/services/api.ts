import type { Job } from '@prisma/client'
import type { Scene } from '@shared/types/scene'
import type { VideoWithCollectionsAndProjects, VideoWithFolderPath } from '../types'

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

    list: (page: number, limit: number, query: string) =>
        apiClient.request<{
            videos: VideoWithFolderPath[]
            page: number
            hasMore: boolean
        }>(`/api/videos?page=${page}&limit=${limit}&search=${encodeURIComponent(query)}`),

    get: (id: string) =>
        apiClient.request<{
            video: VideoWithCollectionsAndProjects
            scenes: Scene[]
            isProcessing: boolean
            videoExist: boolean
            processedJob: Job
            processingRatio: number
        }>(`/api/videos/${id}`),

    delete: (id: string) =>
        apiClient.request<void>(`/api/videos/${id}`, {
            method: 'DELETE',
        }),
    relinkVideo: (id: string, newSource: string) =>
        apiClient.request<void>(`/api/videos/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({
                newSource,
            }),
        }),
    reindexVideo: (id: string) =>
        apiClient.request<void>(`/api/videos/${id}`, {
            method: 'PUT',
        }),
}
