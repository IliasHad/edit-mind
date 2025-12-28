import { AnimatePresence } from 'framer-motion'
import { DashboardLayout } from '~/layouts/DashboardLayout'
import { useChat } from '../features/prompt/hooks/useChat'
import { useLoaderData, useParams, type LoaderFunctionArgs, type MetaFunction } from 'react-router'
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
  const user = await getUser(request)
  if (!user) {
    return { chats: [] }
  }

  const chats = await prisma.chat.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  const metadata = await getVideosMetadataSummary()
  const suggestions = generateSearchSuggestions(metadata)
  return { suggestions, chats }
}

export default function ChatPage() {
  const { id } = useParams()
  const { suggestions, chats } = useLoaderData<typeof loader>()

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
    chat,
  } = useChat(id)

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
                  chat={chat}
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
          isLocked={chat?.isLocked}
        />
      </div>
    </DashboardLayout>
  )
}
