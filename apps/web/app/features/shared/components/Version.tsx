import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'
import { useApp } from '~/features/shared/hooks/useApp'

export function Version() {
  const { app } = useApp()

  if (!app?.version) return null

  const hasUpdate = app.latestVersion && !app.isLatest

  return (
    <div className="px-4 py-3 border-t border-white/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/50">v{app.version}</span>
          {hasUpdate && (
            <span className="text-[10px] text-amber-400 font-medium">
              v{app.latestVersion} available
            </span>
          )}
        </div>

        <a
          href="https://github.com/iliashad/edit-mind/releases"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-all duration-200"
          title="View releases"
        >
          <ArrowTopRightOnSquareIcon className="w-4 h-4" />
        </a>
      </div>
    </div>
  )
}