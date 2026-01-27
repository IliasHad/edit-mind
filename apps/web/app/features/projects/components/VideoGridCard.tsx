import { VideoCameraIcon } from '@heroicons/react/24/solid'
import { humanizeSeconds } from '~/features/shared/utils/duration'
import type { VideoWithFolderPath } from '~/features/videos/types'
import { Button } from '@ui/components/Button'

interface VideoGridCardProps {
  video: VideoWithFolderPath
  isSelected: boolean
  onToggle: () => void
}

export function VideoGridCard({ video, isSelected, onToggle }: VideoGridCardProps) {
  return (
    <Button
      type="button"
      onClick={onToggle}
      role="checkbox"
      aria-checked={isSelected}
      variant="ghost"
      className={`group relative overflow-hidden rounded-xl border-2 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99] ${
        isSelected
          ? 'border-black shadow-lg dark:border-white'
          : 'border-black/10 hover:border-black/20 dark:border-white/10 dark:hover:border-white/20'
      }`}
    >
      <div className="relative aspect-video overflow-hidden bg-black/5 dark:bg-white/5">
        {video.thumbnailUrl ? (
          <>
            <img
              src={`/thumbnails/${video.thumbnailUrl}`}
              alt={video.name}
              className="h-full w-72 object-cover"
              loading="lazy"
            />
            {video.duration && (
              <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-2 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                {humanizeSeconds(Number(video.duration))}
              </span>
            )}
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <VideoCameraIcon className="h-12 w-12 text-black/20 dark:text-white/20" />
          </div>
        )}

        <div className="absolute left-2 top-2">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-md border-2 backdrop-blur-sm transition-all duration-200 ${
              isSelected
                ? 'border-black bg-black dark:border-white dark:bg-white'
                : 'border-white bg-white/90 group-hover:scale-110 dark:border-black dark:bg-black/90'
            }`}
          >
            {isSelected && (
              <svg
                className="h-4 w-4 text-white dark:text-black"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
      </div>

      <div className="min-w-0 space-y-1 p-3">
        <p className="truncate text-sm font-semibold leading-tight text-black dark:text-white">{video.name}</p>
        {video.folder.path && (
          <p className="truncate text-xs leading-tight text-black/60 dark:text-white/60">{video.folder.path}</p>
        )}
      </div>
    </Button>
  )
}