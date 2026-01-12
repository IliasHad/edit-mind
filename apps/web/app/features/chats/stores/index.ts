import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

import type { Chat, ChatMessage } from '@prisma/client'
import type { ChatSuggestion } from '@shared/types/chat'
import type { ChatMessageWithScenes, PaginationInfo } from '../types'
import { apiClient } from '../services/api'

interface ChatState {
  // Chats
  chats: Chat[]
  chatsLoading: boolean
  chatsError: string | null
  chatsLastFetched: number | null
  chatsPagination: PaginationInfo | null

  // Current Chat
  currentChat: Chat | null
  currentChatMessages: ChatMessageWithScenes[]
  currentChatLoading: boolean
  currentChatError: string | null
  currentChatInput: string

  // Suggestions
  suggestions: ChatSuggestion[]
  suggestionsLoading: boolean
  suggestionsError: string | null
  suggestionsLastFetched: number | null

  // Actions - Chats
  fetchChats: (options?: { page?: number; limit?: number; force?: boolean }) => Promise<void>
  fetchChatById: (chatId: string, force?: boolean) => Promise<void>
  createChat: (prompt: string, projectId?: string) => Promise<Chat | null>
  updateChat: (chatId: string, data: Partial<Chat>) => Promise<void>
  deleteChat: (chatId: string) => Promise<void>
  setCurrentChat: (chat: Chat | null) => void
  clearChatsError: () => void
  invalidateChats: () => void

  // Actions - Messages
  fetchChatMessages: (chatId: string, force?: boolean) => Promise<void>
  addMessageToChat: (chatId: string, prompt: string) => Promise<ChatMessage | null>
  stitchMessageScenes: (messageId: string, selectedSceneIds: string[]) => Promise<void>
  exportMessageScenes: (messageId: string, selectedSceneIds: string[]) => Promise<void>
  clearCurrentChatError: () => void

  // Actions - Input
  setCurrentChatInput: (input: string) => void
  clearCurrentChatInput: () => void
  clearCurrentChat: () => void

  // Actions - Suggestions
  fetchSuggestions: (force?: boolean) => Promise<void>
  clearSuggestionsError: () => void

  // Utility
  reset: () => void
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const CHAT_CACHE_DURATION = 2 * 60 * 1000 // 2 minutes

const initialState = {
  chats: [],
  chatsLoading: false,
  chatsError: null,
  chatsLastFetched: null,
  chatsPagination: null,

  currentChat: null,
  currentChatMessages: [],
  currentChatLoading: false,
  currentChatError: null,
  currentChatInput: '',

  suggestions: [],
  suggestionsLoading: false,
  suggestionsError: null,
  suggestionsLastFetched: null,
}

export const useChatStore = create<ChatState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        fetchChats: async (options = {}) => {
          const { page = 1, limit = 20, force = false } = options
          const state = get()

          if (state.chatsLoading) return

          const now = Date.now()
          if (!force && state.chatsLastFetched && now - state.chatsLastFetched < CHAT_CACHE_DURATION) {
            return
          }

          set({ chatsLoading: true, chatsError: null, currentChatLoading: true })

          try {
            const data = await apiClient.chats.list(page, limit)

            set({
              chats: data.chats,
              chatsPagination: data.pagination,
              chatsLoading: false,
              chatsLastFetched: Date.now(),
              currentChatLoading: false,
            })
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch chats'
            set({ chatsLoading: false, chatsError: message })
            console.error('Error fetching chats:', error)
          }
        },

        fetchChatById: async (chatId, force = false) => {
          const state = get()

          if (state.currentChatLoading) return
          if (!force && state.currentChat?.id === chatId) return

          set({ currentChatLoading: true, currentChatError: null })

          try {
            const data = await apiClient.chats.get(chatId)

            set({ currentChat: data.chat })

            await get().fetchChatMessages(chatId)

            set({ currentChatLoading: false })
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch chat'
            set({ currentChatLoading: false, currentChatError: message })
            console.error('Error fetching chat:', error)
          }
        },

        createChat: async (prompt, projectId) => {
          set({ chatsLoading: true, chatsError: null })

          try {
            const result = await apiClient.chats.create({ prompt, projectId })

            set((state) => ({
              chats: [result.chat, ...state.chats],
              currentChat: result.chat,
              currentChatMessages: [result.message],
              currentChatInput: '',
              chatsLoading: false,
            }))

            return result.chat
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create chat'
            set({ chatsLoading: false, chatsError: message })
            console.error('Error creating chat:', error)
            return null
          }
        },

        updateChat: async (chatId, data) => {
          try {
            const result = await apiClient.chats.update(chatId, data)
            const updatedChat = result.chat

            set((state) => ({
              chats: state.chats.map((c) => (c.id === chatId ? { ...c, ...updatedChat } : c)),
              currentChat:
                state.currentChat?.id === chatId ? { ...state.currentChat, ...updatedChat } : state.currentChat,
            }))
          } catch (error) {
            console.error('Error updating chat:', error)
            throw error
          }
        },

        deleteChat: async (chatId) => {
          try {
            await apiClient.chats.delete(chatId)

            set((state) => ({
              chats: state.chats.filter((c) => c.id !== chatId),
              currentChat: state.currentChat?.id === chatId ? null : state.currentChat,
              currentChatMessages: state.currentChat?.id === chatId ? [] : state.currentChatMessages,
              currentChatInput: state.currentChat?.id === chatId ? '' : state.currentChatInput,
            }))
          } catch (error) {
            console.error('Error deleting chat:', error)
            throw error
          }
        },

        setCurrentChat: (chat) => {
          set({
            currentChat: chat,
            currentChatMessages: [],
            currentChatError: null,
            currentChatInput: '',
          })
        },

        clearChatsError: () => {
          set({ chatsError: null })
        },

        invalidateChats: () => {
          set({ chatsLastFetched: null })
        },

        fetchChatMessages: async (chatId) => {
          const state = get()
          const shouldSetLoading = !state.currentChatLoading

          if (shouldSetLoading) {
            set({ currentChatLoading: true, currentChatError: null })
          }

          try {
            const data = await apiClient.chats.messages(chatId)

            set((state) => ({
              currentChatMessages: data.messages,
              currentChat: data.chat ? data.chat : state.currentChat,
              ...(shouldSetLoading && { currentChatLoading: false }),
            }))
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch messages'
            set({ currentChatLoading: false, currentChatError: message })
            console.error('Error fetching messages:', error)
          }
        },

        addMessageToChat: async (chatId, prompt) => {
          set({ chatsLoading: true, chatsError: null })

          try {
            const result = await apiClient.chats.addMessage(chatId, { prompt })

            set((state) => ({
              ...state,
              currentChatMessages: [...state.currentChatMessages, result.message],
              currentChatInput: '',
              chatsLoading: false,
            }))

            return result.message
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create chat'
            set({ chatsLoading: false, chatsError: message })
            console.error('Error creating chat:', error)
            return null
          }
        },

        stitchMessageScenes: async (chatId, selectedSceneIds) => {
          try {
            await apiClient.chats.stitchScenes(chatId, selectedSceneIds)
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to stitch message scenes'
            set({ currentChatLoading: false, currentChatError: message })
            console.error('Error stitching video scenes:', error)
          }
        },

        exportMessageScenes: async (chatId, selectedSceneIds) => {
          try {
            await apiClient.chats.exportScenes(chatId, selectedSceneIds)
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to export message scenes'
            set({ currentChatLoading: false, currentChatError: message })
            console.error('Error stitching video scenes:', error)
          }
        },

        clearCurrentChatError: () => {
          set({ currentChatError: null })
        },

        setCurrentChatInput: (input) => {
          set({ currentChatInput: input })
        },

        clearCurrentChatInput: () => {
          set({ currentChatInput: '' })
        },

        clearCurrentChat: () =>
          set({
            currentChat: null,
            currentChatMessages: [],
            currentChatError: null,
            currentChatInput: '',
          }),

        fetchSuggestions: async (force = false) => {
          const state = get()

          if (state.suggestionsLoading) return

          const now = Date.now()
          if (!force && state.suggestionsLastFetched && now - state.suggestionsLastFetched < CACHE_DURATION) {
            return
          }

          set({ suggestionsLoading: true, suggestionsError: null })

          try {
            const data = await apiClient.suggestions.list()

            set({
              suggestions: data.suggestions,
              suggestionsLoading: false,
              suggestionsLastFetched: Date.now(),
            })
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch suggestions'
            set({ suggestionsLoading: false, suggestionsError: message })
            console.error('Error fetching suggestions:', error)
          }
        },

        clearSuggestionsError: () => {
          set({ suggestionsError: null })
        },

        reset: () => {
          set(initialState)
        },
      }),
      {
        name: 'chat-store',
        partialize: (state) => ({
          currentChatId: state.currentChat?.id,
        }),
      }
    ),
    { name: 'ChatStore' }
  )
)
