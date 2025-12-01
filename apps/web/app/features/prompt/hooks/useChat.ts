import type { Chat, ChatMessage } from '@prisma/client'
import type { Scene } from '@shared/schemas'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useFetcher, useNavigate } from 'react-router'

interface ChatMessageWithScenes extends ChatMessage {
  outputScenes: Scene[]
}

export function useChat(chatId?: string) {
  const [chat, setChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<ChatMessageWithScenes[]>([])
  const [selectedScenes, setSelectedScenes] = useState<Set<string>>(new Set())
  const [input, setInput] = useState('')
  const [isStitchingState, setIsStitchingState] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const messagesFetcher = useFetcher<{ messages: ChatMessageWithScenes[]; chat: Chat }>()
  const sendMessageFetcher = useFetcher<{ chatId?: string; message?: ChatMessageWithScenes }>()
  const stitchFetcher = useFetcher<{ message: ChatMessageWithScenes }>()

  const revalidationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!chatId) {
      setMessages([])
      setSelectedScenes(new Set())
      return
    }

    messagesFetcher.load(`/api/chats/${chatId}/messages`)

    revalidationIntervalRef.current = setInterval(() => {
      if (messagesFetcher.state === 'idle') {
        messagesFetcher.load(`/api/chats/${chatId}/messages`)
      }
    }, 1000)

    return () => {
      if (revalidationIntervalRef.current) {
        clearInterval(revalidationIntervalRef.current)
        revalidationIntervalRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId])

  useEffect(() => {
    if (messagesFetcher.data?.messages) {
      setMessages(messagesFetcher.data.messages)
    }
    if (messagesFetcher.data?.chat) {
      setChat(messagesFetcher.data.chat)
    }
  }, [messagesFetcher.data])

  useEffect(() => {
    if (sendMessageFetcher.data) {
      if (sendMessageFetcher.data.chatId) {
        navigate(`/app/prompt/${sendMessageFetcher.data.chatId}`)
      }
      const newMessage = sendMessageFetcher.data?.message
      if (newMessage) {
        setMessages((prev) => [...prev, newMessage])
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendMessageFetcher.data])

  useEffect(() => {
    if (stitchFetcher.data) {
      setIsStitchingState(false)
      const stitchedMessage = stitchFetcher.data?.message
      if (stitchedMessage) {
        setMessages((prev) => prev.map((m) => (m.id === stitchedMessage.id ? stitchedMessage : m)))
      }
    }
  }, [stitchFetcher.data])

  const isLoading = sendMessageFetcher.state === 'submitting' || sendMessageFetcher.state === 'loading'

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return

    const prompt = input.trim()
    setInput('')

    const tempUserMessage: ChatMessageWithScenes = {
      id: `temp-${Date.now()}`,
      chatId: chatId || '',
      sender: 'user',
      text: prompt,
      outputSceneIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      outputScenes: [],
      stitchedVideoPath: null,
      isError: false,
      tokensUsed: BigInt(0),
    }

    setMessages((prev) => [...prev, tempUserMessage])

    try {
      if (!chatId) {
        sendMessageFetcher.submit(
          { prompt },
          {
            method: 'POST',
            action: '/api/chats',
            encType: 'application/json',
          }
        )
      } else {
        sendMessageFetcher.submit(
          { prompt },
          {
            method: 'POST',
            action: `/api/chats/${chatId}/messages`,
            encType: 'application/json',
          }
        )
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id))
      setInput(prompt)
    }
  }, [input, isLoading, chatId, sendMessageFetcher])

  const handleSuggestionClick = useCallback((text: string) => {
    setInput(text)
    inputRef.current?.focus()
  }, [])

  const toggleSceneSelection = useCallback((sceneId: string) => {
    setSelectedScenes((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(sceneId)) {
        newSet.delete(sceneId)
      } else {
        newSet.add(sceneId)
      }
      return newSet
    })
  }, [])

  const stitchSelectedScenes = useCallback(
    async (messageId: string) => {
      if (selectedScenes.size === 0) return

      setIsStitchingState(true)
      stitchFetcher.submit(
        { selectedSceneIds: Array.from(selectedScenes) },
        {
          method: 'POST',
          action: `/api/messages/${messageId}/stitcher`,
          encType: 'application/json',
        }
      )
    },
    [selectedScenes, stitchFetcher]
  )

  const clearSelectedScenes = useCallback(() => {
    setSelectedScenes(new Set())
  }, [])

  const selectAllScenes = useCallback((sceneIds: string[]) => {
    setSelectedScenes(new Set(sceneIds))
  }, [])

  const pauseRevalidation = useCallback(() => {
    if (revalidationIntervalRef.current) {
      clearInterval(revalidationIntervalRef.current)
      revalidationIntervalRef.current = null
    }
  }, [])

  const resumeRevalidation = useCallback(() => {
    if (!chatId || revalidationIntervalRef.current) return

    revalidationIntervalRef.current = setInterval(() => {
      if (messagesFetcher.state === 'idle') {
        messagesFetcher.load(`/api/chats/${chatId}/messages`)
      }
    }, 1000)
  }, [chatId, messagesFetcher])

  return {
    messages,
    input,
    isLoading,
    messagesEndRef,
    inputRef,
    setInput,
    sendMessage,
    handleSuggestionClick,
    selectedScenes,
    toggleSceneSelection,
    setSelectedScenes,
    stitchSelectedScenes,
    clearSelectedScenes,
    selectAllScenes,
    pauseRevalidation,
    resumeRevalidation,
    isStitching: isStitchingState,
    isSending: sendMessageFetcher.state !== 'idle',
    isRefreshing: messagesFetcher.state === 'loading',
    chat,
  }
}
