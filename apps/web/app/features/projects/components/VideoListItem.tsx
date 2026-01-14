import { humanizeSeconds } from "~/features/shared/utils/duration"
import type { VideoWithFolderPath } from "~/features/videos/types"

interface VideoListItemProps {
    video: VideoWithFolderPath,
    isSelected: boolean
    onToggle: () => void
}

export function VideoListItem({ video, isSelected, onToggle }:VideoListItemProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`
        w-full p-4 flex items-center gap-4
        border-b border-black/5 dark:border-white/5 last:border-0
        transition-all duration-200 text-left
        hover:bg-black/5 dark:hover:bg-white/5
        ${isSelected ? 'bg-black/5 dark:bg-white/5' : ''}
      `}
    >
      <div
        className={`
        w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0
        transition-all duration-200
        ${
          isSelected
            ? 'bg-black dark:bg-white border-black dark:border-white'
            : 'border-black/30 dark:border-white/30 hover:scale-110'
        }
      `}
      >
        {isSelected && (
          <svg
            className="w-3 h-3 text-white dark:text-black"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      {video.thumbnailUrl && (
        <div className="relative shrink-0 overflow-hidden rounded-lg">
          <img
            src={`/thumbnails/${video.thumbnailUrl}`}
            alt=""
            className="w-32 h-18 object-cover"
            loading="lazy"
          />
          {video.duration && (
            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 text-xs font-semibold text-white bg-black/80 rounded backdrop-blur-sm">
              {humanizeSeconds(parseInt(video.duration.toString()))}
            </span>
          )}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-black dark:text-white truncate mb-1">
          {video.name}
        </p>
        {video.folder.path && (
          <p className="text-xs text-black/60 dark:text-white/60 truncate">{video.folder.path}</p>
        )}
      </div>
    </button>
  )
}