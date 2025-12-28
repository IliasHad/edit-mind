import { AnimatePresence } from 'framer-motion'
import { DashboardLayout } from '~/layouts/DashboardLayout'
import { useChat } from '../features/prompt/hooks/useChat'
import { useLoaderData, type LoaderFunctionArgs, type MetaFunction } from 'react-router'
import { getVideosMetadataSummary } from '@vector/services/vectorDb'
import { generateSearchSuggestions } from '@search/utils/search'
import { ChatHistory } from '~/features/prompt/components/ChatHistory'
import { Welcome } from '~/features/prompt/components/Welcome'
import { MessageList } from '~/features/prompt/components/MessageList'
import { LoadingIndicator } from '~/features/prompt/components/LoadingIndicator'
import { ChatInput } from '~/features/prompt/components/ChatInput'
import { getUser } from '~/services/user.sever'
import { prisma } from '~/services/database'

export const meta: MetaFunction = () => {
  return [{ title: 'Prompt | Edit Mind' }]
}

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const user = await getUser(request)
    if (!user) return { success: false, error: 'No user authenticated' }

    const chats = await prisma.chat.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    const metadata = await getVideosMetadataSummary()
    const suggestions = generateSearchSuggestions(metadata)
    return { suggestions, chats }
  } catch {
    return { suggestions: [], chats: [] }
  }
}

export default function ChatPage() {
  const {
    input,
    isLoading,
    inputRef,
    setInput,
    sendMessage,
    handleSuggestionClick,
    messages,
    messagesEndRef,
    selectedScenes,
    toggleSceneSelection,
    stitchSelectedScenes,
    isStitching,
  } = useChat()
  const { suggestions, chats } = useLoaderData<typeof loader>()

  return (
    <DashboardLayout sidebar={<ChatHistory chats={chats} />}>
      <div className="flex flex-col h-full min-h-screen">
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
          <AnimatePresence mode="wait">
            {messages.length === 0 && suggestions ? (
              <Welcome onSuggestionClick={handleSuggestionClick} suggestions={suggestions} />
            ) : (
              <div className="max-w-4xl mx-auto space-y-6 pb-8">
                <MessageList
                  messages={messages}
                  selectedScenes={selectedScenes}
                  handleSelectScene={toggleSceneSelection}
                  stitchSelectedScenes={stitchSelectedScenes}
                  isStitching={isStitching}
                />
                {isLoading && <LoadingIndicator />}
                <div ref={messagesEndRef} />
              </div>
            )}
          </AnimatePresence>
        </main>
        <ChatInput
          input={input}
          setInput={setInput}
          sendMessage={sendMessage}
          isLoading={isLoading}
          inputRef={inputRef}
        />
      </div>
    </DashboardLayout>
  )
}
