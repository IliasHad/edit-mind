import type { Scene } from '@shared/schemas'
import type { CollectionWithItems } from '../types'
import type { SortOption, SortOrder } from '~/features/videos/types'

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
      collections: CollectionWithItems[]
      totalDuration: number
      totalVideos: number
    }>('/api/collections'),

  get: (id: string, sortBy: SortOption, sortOrder: SortOrder) =>
    apiClient.request<{ collection: CollectionWithItems }>(
      `/api/collections/${id}?sortOption=${sortBy}&sortOrder=${sortOrder}`
    ),

  scenes: (id: string) => apiClient.request<{ scenes: Scene[] }>(`/api/collections/${id}/scenes`),

  exportScenes: (id: string, selectedSceneIds: string[]) =>
    apiClient.request<void>(`/api/collections/${id}/scenes/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ selectedSceneIds }),
    }),
}
