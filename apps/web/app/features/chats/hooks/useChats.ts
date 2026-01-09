import { useEffect } from 'react'
import { useChatStore } from '../stores'

export const useChats = () => {
  const chats = useChatStore((state) => state.chats)
  const loading = useChatStore((state) => state.chatsLoading)
  const error = useChatStore((state) => state.chatsError)

  const fetch = useChatStore((state) => state.fetchChats)
  const clearError = useChatStore((state) => state.clearChatsError)
  const deleteChat = useChatStore((state) => state.deleteChat)

  useEffect(() => {
    fetch()
  }, [fetch])

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const lastWeek = new Date(today)
  lastWeek.setDate(lastWeek.getDate() - 7)
  const lastMonth = new Date(today)
  lastMonth.setMonth(lastMonth.getMonth() - 1)

  const groupedChats = {
    today: chats.filter((chat) => new Date(chat.updatedAt) >= today),
    yesterday: chats.filter((chat) => new Date(chat.updatedAt) >= yesterday && new Date(chat.updatedAt) < today),
    lastWeek: chats.filter((chat) => new Date(chat.updatedAt) >= lastWeek && new Date(chat.updatedAt) < yesterday),
    lastMonth: chats.filter((chat) => new Date(chat.updatedAt) >= lastMonth && new Date(chat.updatedAt) < lastWeek),
    older: chats.filter((chat) => new Date(chat.updatedAt) < lastMonth),
  }

  return {
    chats,
    loading,
    error,
    fetch,
    clearError,
    groupedChats,
    deleteChat,
  }
}
