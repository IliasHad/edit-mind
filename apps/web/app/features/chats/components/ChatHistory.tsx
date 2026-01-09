import { useMemo } from 'react'
import { isSameDay } from 'date-fns'
import { Link } from '~/features/shared/components/Link'
import { ChatBubbleLeftIcon } from '@heroicons/react/24/outline'
import { useChats } from '../hooks/useChats'

export function ChatHistory() {
  const { chats } = useChats()

  const { today, yesterday, others } = useMemo(() => {
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)

    const todayChats = chats.filter((chat) => isSameDay(new Date(chat.createdAt), today))

    const yesterdayChats = chats.filter((chat) => isSameDay(new Date(chat.createdAt), yesterday))
    const othersChats = chats.filter(
      (chat) => !isSameDay(new Date(chat.createdAt), yesterday) && !isSameDay(new Date(chat.createdAt), today)
    )

    return { today: todayChats, yesterday: yesterdayChats, others: othersChats }
  }, [chats])

  return (
    <div className="flex-1 overflow-hidden">
      <div className="h-full overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-neutral-700">
        {today.length > 0 && (
          <div className="border-t mt-4 py-4 dark:border-white/10">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-300 mb-2 px-3">Today</h3>
            <div className="space-y-1">
              {today.map((chat) => (
                <Link
                  key={chat.id}
                  icon={<ChatBubbleLeftIcon className="w-5 h-5" />}
                  to={`/app/chats/${chat.id}`}
                  label={chat.title || 'Untitled Chat'}
                />
              ))}
            </div>
          </div>
        )}

        {yesterday.length > 0 && (
          <div className="border-t mt-4 py-4 dark:border-white/10">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-300 mb-2 px-3">Yesterday</h3>
            <div className="space-y-1">
              {yesterday.map((chat) => (
                <Link
                  key={chat.id}
                  icon={<ChatBubbleLeftIcon className="w-5 h-5" />}
                  to={`/app/chats/${chat.id}`}
                  label={chat.title || 'Untitled Chat'}
                />
              ))}
            </div>
          </div>
        )}

        {others.length > 0 && (
          <div className="border-t mt-4 py-4 dark:border-white/10">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-300 mb-2 px-3">Previously</h3>
            <div className="space-y-1">
              {others.map((chat) => (
                <Link
                  key={chat.id}
                  icon={<ChatBubbleLeftIcon className="w-5 h-5" />}
                  to={`/app/chats/${chat.id}`}
                  label={chat.title || 'Untitled Chat'}
                />
              ))}
            </div>
          </div>
        )}

        {today.length === 0 && yesterday.length === 0 && others.length === 0 && (
          <div className="text-center py-8 px-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">No conversations yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
