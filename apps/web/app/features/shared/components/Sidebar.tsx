import {
  HomeIcon,
  Cog6ToothIcon,
  ChevronLeftIcon,
  MagnifyingGlassIcon,
  ChatBubbleLeftIcon,
  UsersIcon,
  FolderIcon,
  FilmIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline'
import { Link } from './Link'
import { useSession } from '~/features/auth/hooks/useSession'
import type { JSX } from 'react'
import { useAuth } from '~/features/auth/hooks/useAuth'
import { Button } from '@ui/components/Button'
import { ServicesStatus } from './ServicesStatus'

interface SidebarProps {
  isCollapsed?: boolean
  setIsCollapsed?: (v: boolean) => void
  children?: JSX.Element
}

export function Sidebar({ isCollapsed = false, setIsCollapsed, children }: SidebarProps) {
  const { session } = useSession()
  const { handleLogout: logout } = useAuth()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <aside
      className={`
        fixed left-0 top-0 h-screen z-50
        ${isCollapsed ? 'w-16' : 'w-64'}
        border-r border-gray-800
        flex flex-col transition-all duration-300 ease-out
      `}
    >
      <div className="shrink-0 p-4 border-b border-gray-200 dark:border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!isCollapsed && (
              <>
                <div className="w-8 h-8 rounded-full bg-linear-to-br from-purple-600 to-indigo-400 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                  {session.user?.email?.charAt(0).toUpperCase() || 'E'}
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[130px]">
                  {session.user?.email}
                </span>
              </>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={() => setIsCollapsed?.(!isCollapsed)} className="border-none">
            <ChevronLeftIcon
              className={`w-auto h-4 text-gray-700 dark:text-gray-300 transition-transform ${
                isCollapsed ? 'rotate-180' : ''
              }`}
            />
          </Button>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <Link isCollapsed={isCollapsed} icon={<HomeIcon className="w-5 h-5" />} to="/app/home" label="Dashboard" />
        <Link
          isCollapsed={isCollapsed}
          icon={<MagnifyingGlassIcon className="w-5 h-5" />}
          to="/app/search"
          label="Search"
        />
        <Link
          isCollapsed={isCollapsed}
          icon={<ChatBubbleLeftIcon className="w-5 h-5" />}
          to="/app/chats/new"
          label="New Chat"
        />
        <Link
          isCollapsed={isCollapsed}
          icon={<FolderIcon className="w-5 h-5" />}
          to="/app/collections"
          label="Collections"
        />
        <Link isCollapsed={isCollapsed} icon={<FilmIcon className="w-5 h-5" />} to="/app/projects" label="Projects" />
        <Link
          isCollapsed={isCollapsed}
          icon={<UsersIcon className="w-5 h-5" />}
          to="/app/faces"
          label="Face Training"
        />
        {children}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <ServicesStatus isCollapsed={isCollapsed} />
      </div>

      <div className="p-4 border-t border-gray-800 space-y-2">
        <Link
          isCollapsed={isCollapsed}
          icon={<Cog6ToothIcon className="w-5 h-5" />}
          to="/app/settings"
          label="Settings"
        />
        <button
          onClick={handleLogout}
          className={`
            w-full flex items-center gap-3 px-3 py-2
            text-gray-700 dark:text-gray-300
            hover:bg-gray-100 dark:hover:bg-neutral-800
            rounded-lg transition-colors
            ${isCollapsed ? 'justify-center' : ''}
          `}
          title={isCollapsed ? 'Logout' : undefined}
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>

      <div className="p-4 border-t border-gray-800">
        {!isCollapsed ? (
          <div className="space-y-3">
            <a
              href="https://github.com/iliashad/edit-mind"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-medium">Star us on GitHub</span>
            </a>
          </div>
        ) : (
          <div className="space-y-2 flex flex-col items-center">
            <a
              href="https://github.com/iliashad/edit-mind"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              title="Star us on GitHub"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
            </a>
          </div>
        )}
      </div>
    </aside>
  )
}
