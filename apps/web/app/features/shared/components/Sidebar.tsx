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
          <button
            onClick={() => setIsCollapsed?.(!isCollapsed)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
          >
            <ChevronLeftIcon
              className={`w-4 h-4 text-gray-700 dark:text-gray-300 transition-transform ${
                isCollapsed ? 'rotate-180' : ''
              }`}
            />
          </button>
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
    </aside>
  )
}
