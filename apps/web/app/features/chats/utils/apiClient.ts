import type { ChatMessage, Chat } from '@prisma/client';
import type { ChatMessageWithScenes, PaginationInfo } from '../types'
import type { ChatSuggestion } from '@shared/types/chat'

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

    chats: {
        list: (page: number, limit: number) =>
            apiClient.request<{ chats: Chat[]; pagination: PaginationInfo }>(`/api/chats?page=${page}&limit=${limit}`),

        get: (chatId: string) => apiClient.request<{ chat: Chat }>(`/api/chats/${chatId}`),

        create: (data: { prompt: string; projectId?: string }) =>
            apiClient.request<{ chat: Chat; message: ChatMessage }>('/api/chats', {
                method: 'POST',
                body: JSON.stringify(data),
            }),

        update: (chatId: string, data: Partial<Chat>) =>
            apiClient.request<{ chat: Chat }>(`/api/chats/${chatId}`, {
                method: 'PATCH',
                body: JSON.stringify(data),
            }),
        addMessage: (chatId: string, data: { prompt: string }) =>
            apiClient.request<{ message: ChatMessage }>(`/api/chats/${chatId}/messages`, {
                method: 'PATCH',
                body: JSON.stringify(data),
            }),

        delete: (chatId: string) =>
            apiClient.request<void>(`/api/chats/${chatId}`, {
                method: 'DELETE',
            }),

        messages: (chatId: string) =>
            apiClient.request<{ messages: ChatMessageWithScenes[]; chat?: Chat }>(`/api/chats/${chatId}/messages`),

        stitchScenes: (chatId: string, selectedSceneIds: string[]) =>
            apiClient.request<{ messages: ChatMessageWithScenes[]; chat?: Chat }>(`/api/chats/${chatId}/stitcher`, {
                method: 'PATCH',
                body: JSON.stringify({
                    selectedSceneIds,
                }),
            }),
        exportScenes: (chatId: string, selectedSceneIds: string[]) =>
            apiClient.request<{ messages: ChatMessageWithScenes[]; chat?: Chat }>(`/api/chats/${chatId}/export`, {
                method: 'PATCH',
                body: JSON.stringify({
                    selectedSceneIds,
                }),
            }),
    },

    suggestions: {
        list: () => apiClient.request<{ suggestions: ChatSuggestion[] }>('/api/chat/suggestions'),
    },
}
