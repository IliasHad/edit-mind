import { ArrowRightIcon, CalendarIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/solid'
import { Link } from "react-router"

interface ChatCardProps {
  id: string
  title: string | null
  messageCount: number
  createdAt: Date
  updatedAt: Date
}

export function ChatCard({ id, title, messageCount, createdAt, updatedAt }: ChatCardProps) {
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(createdAt))

  const isRecent = new Date(updatedAt).getTime() > Date.now() - 24 * 60 * 60 * 1000

  return (
    <Link
      to={`/app/chats/${id}`}
      className="group relative block
               bg-white dark:bg-zinc-900
               rounded-lg p-6
               ring-1 ring-black/5 dark:ring-white/10
               hover:ring-black/10 dark:hover:ring-white/20
               shadow-sm hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/20
               transition-all duration-300
               hover:-translate-y-1"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0 pr-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white truncate mb-1">
            {title || 'Untitled Chat'}
          </h3>
          <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-1.5">
              <ChatBubbleLeftIcon className="w-3.5 h-3.5" />
              <span>{messageCount} {messageCount === 1 ? 'message' : 'messages'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>

        <div className="shrink-0 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
          <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            <ArrowRightIcon className="w-4 h-4" />
          </div>
        </div>
      </div>

      {isRecent && (
        <div className="inline-flex items-center px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs text-zinc-600 dark:text-zinc-400">
          Active today
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r from-zinc-900 via-zinc-600 to-zinc-900 dark:from-white dark:via-zinc-400 dark:to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-b-lg" />
    </Link>
  )
}
