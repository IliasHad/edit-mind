import type { JSX } from 'react'
import { NavLink } from 'react-router'

export function Link({
  isCollapsed,
  icon,
  label,
  to,
}: {
  isCollapsed?: boolean
  icon: JSX.Element
  label: string
  to: string
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center ${isCollapsed && 'justify-center'} gap-3 px-2 py-2 rounded-lg text-sm font-medium transition-colors
        ${
          isActive
            ? 'bg-gray-100 dark:bg-gray-200 text-gray-900 dark:text-black'
            : 'text-gray-600 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-200 dark:hover:text-black'
        }`
      }
    >
      <div className="w-5 h-5 shrink-0 flex items-center justify-center">{icon}</div>
      {!isCollapsed && <span className="truncate">{label}</span>}
    </NavLink>
  )
}
