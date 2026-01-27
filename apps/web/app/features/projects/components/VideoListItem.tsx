import { Button } from '@ui/components/Button'
import { humanizeSeconds } from '~/features/shared/utils/duration'
import type { VideoWithFolderPath } from '~/features/videos/types'

interface VideoListItemProps {
  video: VideoWithFolderPath
  isSelected: boolean
  onToggle: () => void
}

export function VideoListItem({ video, isSelected, onToggle }: VideoListItemProps) {
  return (
    <Button
      type="button"
      onClick={onToggle}
      role="checkbox"
      aria-checked={isSelected}
      variant="ghost"
      className="group rounded-none flex w-full items-center gap-4 p-4 text-left transition-all duration-200 hover:bg-black/5 active:scale-[0.99] dark:hover:bg-white/5 border-l-4 border-transparent"
    >
      <div
        className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center self-start rounded-md border-2 transition-all ${
          isSelected ? 'border-black bg-black dark:border-white dark:bg-white' : 'border-black/30 dark:border-white/30'
        }`}
      >
        {isSelected && (
          <svg
            className="h-3 w-3 text-white dark:text-black"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      {video.thumbnailUrl && (
        <div className="relative w-28 shrink-0 overflow-hidden rounded-lg">
          <img
            src={`/thumbnails/${video.thumbnailUrl}`}
            alt={video.name}
            className="aspect-video w-full object-cover"
            loading="lazy"
          />
          {video.duration && (
            <span className="absolute bottom-1 right-1 whitespace-nowrap rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-medium text-white">
              {humanizeSeconds(Number(video.duration))}
            </span>
          )}
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <p className="truncate text-sm font-semibold leading-tight text-black dark:text-white">{video.name}</p>
        {video.folder.path && (
          <p className="truncate text-xs leading-tight text-black/50 dark:text-white/50">{video.folder.path}</p>
        )}
      </div>
    </Button>
  )
}
