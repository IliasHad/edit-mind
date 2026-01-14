import { VideoCameraIcon } from "@heroicons/react/24/solid"
import { humanizeSeconds } from "~/features/shared/utils/duration"
import type { VideoWithFolderPath } from "~/features/videos/types"

interface VideoGridCardProps {
    video: VideoWithFolderPath,
    isSelected: boolean
    onToggle: () => void
}

export function VideoGridCard({ video, isSelected, onToggle }:VideoGridCardProps) {
    return (
    <button
      type="button"
      onClick={onToggle}
      className={`
        relative group rounded-xl overflow-hidden
        border-2 transition-all duration-200 text-left
        ${
          isSelected
            ? 'border-black dark:border-white shadow-lg'
            : 'border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'
        }
      `}
    >
      <div className="relative aspect-video bg-black/5 dark:bg-white/5 overflow-hidden">
        {video.thumbnailUrl ? (
          <>
            <img
              src={`/thumbnails/${video.thumbnailUrl}`}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {video.duration && (
              <span className="absolute bottom-2 right-2 px-2 py-1 text-xs font-semibold text-white bg-black/80 rounded-md backdrop-blur-sm">
                {humanizeSeconds(parseInt(video.duration.toString()))}
              </span>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <VideoCameraIcon className="w-12 h-12 text-black/20 dark:text-white/20" />
          </div>
        )}

        <div className="absolute top-2 left-2">
          <div
            className={`
            w-6 h-6 rounded-md border-2 flex items-center justify-center
            transition-all duration-200 backdrop-blur-sm
            ${
              isSelected
                ? 'bg-black dark:bg-white border-black dark:border-white'
                : 'bg-white/90 dark:bg-black/90 border-white dark:border-black group-hover:scale-110'
            }
          `}
          >
            {isSelected && (
              <svg
                className="w-4 h-4 text-white dark:text-black"
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

      <div className="p-3">
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