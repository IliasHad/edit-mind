import { ClockIcon, EllipsisVerticalIcon } from '@heroicons/react/24/solid'
import { Link, useParams } from 'react-router'
import { smartFormatDate } from '~/features/shared/utils/date'
import type { Chat } from '@prisma/client'
import { useChats } from '../hooks/useChats'
import { DeleteModal } from '~/features/shared/components/DeleteModal'
import { useDeleteModal } from '~/features/shared/hooks/useDeleteModal'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export function ChatItem({ chat }: { chat: Chat }) {
  const { chatId } = useParams()
  const isActive = chatId === chat.id
  const { deleteChat } = useChats()
  const { isOpen, openModal, closeModal } = useDeleteModal()
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleDelete = async () => {
    await deleteChat(chat.id)
  }

  return (
    <>
      <div
        className={`
          group relative w-full rounded-xl transition-all
          ${isActive ? 'bg-black/5 dark:bg-white/5 shadow-sm' : 'hover:bg-black/2 dark:hover:bg-white/2'}
        `}
      >
        <Link to={`/app/chats/${chat.id}`} className="block px-4 py-3.5">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <h3
                className={`text-sm font-medium truncate ${
                  isActive
                    ? 'text-black dark:text-white'
                    : 'text-black/70 dark:text-white/70 group-hover:text-black dark:group-hover:text-white'
                }`}
              >
                {chat.title || 'Untitled conversation'}
              </h3>
              <div className="flex items-center gap-1.5 mt-1">
                <ClockIcon
                  className={`w-3.5 h-3.5 ${
                    isActive ? 'text-black/40 dark:text-white/40' : 'text-black/40 dark:text-white/40'
                  }`}
                />
                <span
                  className={`text-xs ${
                    isActive ? 'text-black/50 dark:text-white/50' : 'text-black/50 dark:text-white/50'
                  }`}
                >
                  {smartFormatDate(new Date(chat.updatedAt))}
                </span>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setShowMenu(!showMenu)
              }}
              className={`
                shrink-0 p-1.5 rounded-lg transition-all
                ${showMenu ? 'opacity-100 bg-black/5 dark:bg-white/5' : 'hover:bg-black/5 dark:hover:bg-white/5'}
                ${isActive ? 'text-black/20 dark:text-white/70' : 'text-black/20 dark:text-white/80'}
              `}
            >
              <EllipsisVerticalIcon className="h-4 w-4" />
            </button>
          </div>
        </Link>

        <AnimatePresence>
          {showMenu && (
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.1 }}
              className="absolute right-0  top-full mt-1 z-10 rounded-xl bg-white dark:bg-black border border-black/10 dark:border-white/10 shadow-lg overflow-hidden"
            >
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowMenu(false)
                  openModal()
                }}
                className="w-full text-center px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
              >
                Delete conversation
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <DeleteModal
        isOpen={isOpen}
        onClose={closeModal}
        onConfirm={handleDelete}
        title="Delete conversation"
        description="Are you sure you want to delete this conversation? This action cannot be undone and all messages will be permanently removed."
        resourceName={chat.title || 'Untitled conversation'}
        confirmText="Delete conversation"
      />
    </>
  )
}
