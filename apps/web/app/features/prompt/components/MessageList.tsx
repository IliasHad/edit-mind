import { Message } from './Message'
import type { Chat, ChatMessage } from '@prisma/client'
import type { Scene } from '@shared/schemas'

type MessageListProps = {
  messages: (ChatMessage & { outputScenes: Scene[] })[]
  selectedScenes: Set<string>
  handleSelectScene: (sceneId: string) => void
  stitchSelectedScenes: (messageId: string) => void
  isStitching: boolean
  chat?: Chat | null
}

export function MessageList({
  messages,
  selectedScenes,
  handleSelectScene,
  stitchSelectedScenes,
  isStitching,
  chat,
}: MessageListProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      {messages.map((msg) => (
        <div key={msg.id} className="space-y-4">
          <Message
            {...msg}
            selectedScenes={selectedScenes}
            handleSelectScene={handleSelectScene}
            stitchSelectedScenes={stitchSelectedScenes}
            isStitching={isStitching}
          />
        </div>
      ))}
      {chat?.isLocked && (
        <div className="mt-4">
          <button className="inline-flex justify-start items-center gap-2 px-4 py-2 rounded-full font-medium text-sm text-white bg-blue-500 hover:bg-blue-600 active:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Start New Chat
          </button>
        </div>
      )}
    </div>
  )
}
