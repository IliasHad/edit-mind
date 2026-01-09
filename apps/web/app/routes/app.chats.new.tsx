import { AnimatePresence } from 'framer-motion'
import { DashboardLayout } from '~/layouts/DashboardLayout'
import { type MetaFunction } from 'react-router'
import { ChatHistory } from '~/features/chats/components/ChatHistory'
import { Welcome } from '~/features/chats/components/Welcome'
import { MessageList } from '~/features/chats/components/MessageList'
import { LoadingIndicator } from '~/features/chats/components/LoadingIndicator'
import { ChatInput } from '~/features/chats/components/ChatInput'
import { useState } from 'react'
import { Sidebar } from '~/features/shared/components/Sidebar'
import { useCurrentChat } from '~/features/chats/hooks/useCurrentChat'
import { useChatSuggestions } from '~/features/chats/hooks/useChatSuggestions'

export const meta: MetaFunction = () => {
  return [{ title: 'Prompt | Edit Mind' }]
}

export default function ChatPage() {
  const { chat, messages, loading, createChat } = useCurrentChat()
  const { suggestions } = useChatSuggestions()
  const [selectedSuggestion, setSelectedSuggestion] = useState<null | string>(null)

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
            {messages.length === 0 && suggestions ? (
              <Welcome onSuggestionClick={setSelectedSuggestion} suggestions={suggestions} />
            ) : chat ? (
              <div className="max-w-4xl mx-auto space-y-6 pb-8">
                <MessageList messages={messages}  />
                {loading && <LoadingIndicator />}
              </div>
            ) : (
              <LoadingIndicator />
            )}
          </AnimatePresence>
        </main>
        <ChatInput
          selectedSuggestion={selectedSuggestion}
          sendMessage={(prompt, projectId) => createChat(prompt, projectId)}
        />
      </div>
    </DashboardLayout>
  )
}
