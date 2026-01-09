import { useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useChatStore } from '../stores'

const useChatInput = () => useChatStore((state) => state.currentChatInput)
const useCurrentChatData = () => useChatStore((state) => state.currentChat)
const useCurrentChatId = () => useChatStore((state) => state.currentChat?.id)
const useCurrentChatMessages = () => useChatStore((state) => state.currentChatMessages)
const useCurrentChatLoading = () => useChatStore((state) => state.currentChatLoading)
const useCurrentChatError = () => useChatStore((state) => state.currentChatError)

export const useCurrentChat = () => {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()

  const currentChat = useCurrentChatData()
  const currentChatId = useCurrentChatId()
  const currentChatMessages = useCurrentChatMessages()
  const currentChatLoading = useCurrentChatLoading()
  const currentChatError = useCurrentChatError()
  const currentChatInput = useChatInput()

  // Get actions
  const setCurrentChat = useChatStore((state) => state.setCurrentChat)
  const fetchChatById = useChatStore((state) => state.fetchChatById)
  const fetchChatMessages = useChatStore((state) => state.fetchChatMessages)
  const addMessageToChat = useChatStore((state) => state.addMessageToChat)
  const clearCurrentChatError = useChatStore((state) => state.clearCurrentChatError)
  const setCurrentChatInput = useChatStore((state) => state.setCurrentChatInput)
  const createChatAction = useChatStore((state) => state.createChat)
  const clearCurrentChat = useChatStore((state) => state.clearCurrentChat)
  const stitchMessageScenes = useChatStore((state) => state.stitchMessageScenes)
  const exportMessageScenes = useChatStore((state) => state.exportMessageScenes)

  const chatsLoading = useChatStore((state) => state.chatsLoading)

  const fetchedChatIdRef = useRef<string | null>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastFetchTimeRef = useRef<number>(0)

  // Determine if we're on the "new chat" route
  const isNewChatRoute = id === 'new'

  // Fetch messages with debounce to prevent too many requests
  const fetchMessagesWithDebounce = useCallback(
    async (chatId: string) => {
      const now = Date.now()
      const minInterval = 2000 // Minimum 2 seconds between fetches

      if (now - lastFetchTimeRef.current < minInterval) {
        return // Skip if we fetched too recently
      }

      lastFetchTimeRef.current = now
      await fetchChatMessages(chatId)
    },
    [fetchChatMessages]
  )

  const isLastMessageThinking = useMemo(() => {
    if (!currentChatMessages?.length) return false
    return currentChatMessages[currentChatMessages.length - 1]?.isThinking
  }, [currentChatMessages])

  const isLastMessageStitchingVideos = useMemo(() => {
    if (!currentChatMessages?.length) return false
    return currentChatMessages[currentChatMessages.length - 1]?.stage === 'stitching'
  }, [currentChatMessages])

  const isLastMessageExporting = useMemo(() => {
    if (!currentChatMessages?.length) return false
    return currentChatMessages[currentChatMessages.length - 1]?.stage === 'exporting_scenes'
  }, [currentChatMessages])

  // Smart polling: faster when assistant is thinking, slower when idle
  const getPollingInterval = useCallback(() => {
    if (isLastMessageThinking || isLastMessageStitchingVideos || isLastMessageExporting) {
      return 2000 // fast polling
    }
    return 30000 // slow / idle
  }, [isLastMessageThinking, isLastMessageStitchingVideos, isLastMessageExporting])

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
  }

  // Setup polling for real-time updates
  useEffect(() => {
    stopPolling()

    // Don't poll on new chat route or when document is hidden
    if (isNewChatRoute || !id || !currentChatId || id !== currentChatId || document.hidden || currentChat?.isLocked) {
      return
    }

    // FIXED: Start polling immediately if we have messages, regardless of thinking state
    // This ensures polling starts after navigation from chat creation
    const shouldPoll =
      currentChatMessages.length > 0 &&
      (isLastMessageThinking || isLastMessageStitchingVideos || isLastMessageExporting)

    if (!shouldPoll) {
      return
    }

    // Start polling immediately
    pollingIntervalRef.current = setInterval(() => {
      fetchMessagesWithDebounce(currentChatId)
    }, getPollingInterval())

    return stopPolling
  }, [
    currentChatId,
    currentChatMessages.length,
    fetchMessagesWithDebounce,
    getPollingInterval,
    id,
    isLastMessageThinking,
    isLastMessageStitchingVideos,
    isLastMessageExporting,
    isNewChatRoute,
    currentChat?.isLocked,
  ])

  // Fetch chat data or clear when switching routes
  useEffect(() => {
    // Case 1: On "/app/chats/new" route - clear current chat
    if (isNewChatRoute) {
      if (currentChatId) {
        fetchedChatIdRef.current = null
        clearCurrentChat()
      }
      return
    }

    // Case 2: No ID in URL (shouldn't happen with your routes, but just in case)
    if (!id) {
      if (currentChatId) {
        fetchedChatIdRef.current = null
        clearCurrentChat()
      }
      return
    }

    // Case 3: We have a valid ID and it's different from current
    if (id !== currentChatId && !currentChatLoading && fetchedChatIdRef.current !== id) {
      fetchedChatIdRef.current = id
      fetchChatById(id)
    }
  }, [id, isNewChatRoute, currentChatId, currentChatLoading, fetchChatById, clearCurrentChat])

  const navigateToChat = useCallback(
    (targetChatId: string) => {
      navigate(`/app/chats/${targetChatId}`)
    },
    [navigate]
  )

  const createChat = useCallback(
    async (prompt: string, projectId?: string) => {
      fetchedChatIdRef.current = null
      const newChat = await createChatAction(prompt, projectId)

      if (newChat?.id) {
        fetchedChatIdRef.current = newChat?.id
        navigateToChat(newChat.id)
      }

      return newChat
    },
    [createChatAction, navigateToChat]
  )

  // Manual refresh for user-triggered updates
  const refreshMessages = useCallback(() => {
    if (id && !isNewChatRoute) {
      fetchMessagesWithDebounce(id)
    }
  }, [id, isNewChatRoute, fetchMessagesWithDebounce])

  return {
    chat: currentChat,
    messages: currentChatMessages,
    loading: currentChatLoading || chatsLoading,
    error: currentChatError,
    id: isNewChatRoute ? null : id,
    isNewChat: isNewChatRoute,
    setCurrentChat,
    fetchChatById,
    fetchChatMessages,
    addMessageToChat,
    clearError: clearCurrentChatError,
    currentChatInput,
    setCurrentChatInput,
    createChat,
    navigateToChat,
    refreshMessages,
    stitchMessageScenes,
    exportMessageScenes,
    clearCurrentChat,
  }
}
