import type { ImmichIntegration, ImmichConfig } from "@immich/types/immich"

export const immichApiClient = {
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

  getConfig: () =>
    immichApiClient.request<{ config: ImmichIntegration | null }>('/api/immich/integration'),

  saveIntegration: (config: ImmichConfig) =>
    immichApiClient.request<{ integration: ImmichIntegration }>('/api/immich/integration', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    }),

  updateIntegration: (config: ImmichConfig) =>
    immichApiClient.request<{ integration: ImmichIntegration }>('/api/immich/integration', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    }),

  deleteIntegration: () =>
    immichApiClient.request<void>('/api/immich/integration', {
      method: 'DELETE',
    }),

  refreshImport: () =>
    immichApiClient.request<{ message: string }>('/api/immich/refresh', {
      method: 'POST',
    }),

  testConnection: (config: ImmichConfig) =>
    immichApiClient.request<{ success: boolean; message: string }>('/api/immich/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    }),
}