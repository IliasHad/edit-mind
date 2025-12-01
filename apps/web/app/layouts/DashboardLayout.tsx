import type { ReactNode } from 'react'
import { useState, cloneElement, isValidElement } from 'react'

interface DashboardLayoutProps {
  children: ReactNode
  sidebar?: ReactNode
}

export function DashboardLayout({ children, sidebar }: DashboardLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(sidebar ? false : true)

  const sidebarWithProps =
    isValidElement(sidebar) &&
    cloneElement(sidebar, {
      isCollapsed,
      setIsCollapsed,
    })

  return (
    <div className="min-h-screen bg-white dark:bg-black font-['SF_Pro_Display','-apple-system','BlinkMacSystemFont','system-ui',sans-serif]">
      {sidebarWithProps}
      <div
        className={`
          transition-all duration-300 ease-out
          ${!sidebar ? '' : isCollapsed ? 'ml-16' : 'ml-72'}
        `}
      >
        <main className="min-h-screen flex flex-col">{children}</main>
      </div>
    </div>
  )
}
