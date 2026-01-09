import { AnimatePresence } from 'framer-motion'
import { DashboardLayout } from '~/layouts/DashboardLayout'
import { type MetaFunction } from 'react-router'
import { ChatHistory } from '~/features/chats/components/ChatHistory'
import { MessageList } from '~/features/chats/components/MessageList'
import { ChatInput } from '~/features/chats/components/ChatInput'
import { useCurrentChat } from '~/features/chats/hooks/useCurrentChat'
import { Sidebar } from '~/features/shared/components/Sidebar'
import { useEffect } from 'react'

export const meta: MetaFunction = () => {
  return [{ title: 'Prompt | Edit Mind' }]
}

export default function ChatPage() {
  const { chat, messages, addMessageToChat, id, refreshMessages, clearCurrentChat } = useCurrentChat()

  useEffect(() => {
    refreshMessages()

    return () => clearCurrentChat()
  }, [clearCurrentChat, refreshMessages])

  return (
    <DashboardLayout
      sidebar={
        <Sidebar>
          <ChatHistory />
        </Sidebar>
      }
    >
      <div className="flex flex-col h-full min-h-screen">
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
          <AnimatePresence mode="wait">
            <div className="max-w-4xl mx-auto space-y-6 pb-8">
              {chat && messages.length > 0 && <MessageList messages={messages} />}
            </div>
          </AnimatePresence>
        </main>

        <ChatInput sendMessage={(prompt) => id && addMessageToChat(id, prompt)} />
      </div>
    </DashboardLayout>
  )
}
