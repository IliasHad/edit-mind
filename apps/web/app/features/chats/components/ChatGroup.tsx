import { ChatItem } from './ChatItem'
import type { Chat } from '@prisma/client'

export function ChatGroup({ title, chats }: { title: string; chats: Chat[] }) {
  if (chats.length === 0) return null

  return (
    <div>
      <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider mb-3 px-2">
        {title}
      </h2>
      <div className="space-y-1">
        {chats.map((chat) => (
          <ChatItem key={chat.id} chat={chat} />
        ))}
      </div>
    </div>
  )
}