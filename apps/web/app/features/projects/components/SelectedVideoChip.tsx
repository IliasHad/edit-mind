import { XMarkIcon } from "@heroicons/react/24/solid";
import type { Video } from "@prisma/client";
import { Button } from "@ui/components/Button";
import { memo } from "react";

export const SelectedVideoChip = memo(({ video, onRemove }: { video: Video; onRemove: (id: string) => void }) => (
  <div
    className="inline-flex items-center gap-2.5 pl-3 pr-2 py-2
               bg-white dark:bg-black
               border border-black/10 dark:border-white/10
               rounded-lg
               group hover:border-black/20 dark:hover:border-white/20
               hover:shadow-sm
               transition-all duration-200"
  >
    <span className="text-sm font-medium text-black dark:text-white max-w-[200px] truncate">
      {video.name}
    </span>
    <Button
      variant='ghost'
      type="button"
      onClick={() => onRemove(video.id)}
      className="p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30
                 text-black/40 hover:text-red-600 dark:text-white/40 dark:hover:text-red-400
                 transition-all duration-200"
      aria-label={`Remove ${video.name}`}
    >
      <XMarkIcon className="w-4 h-4" />
    </Button>
  </div>
))

SelectedVideoChip.displayName = 'SelectedVideoChip'