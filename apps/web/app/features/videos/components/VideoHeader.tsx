import { ArrowPathIcon, TrashIcon } from '@heroicons/react/24/outline'
import { CollectionBadge } from '~/features/collections/components/CollectionBadge'
import { ProjectBadge } from '~/features/projects/components/ProjectBadge'
import { smartFormatDate } from '@shared/utils/duration'
import type { Collection, CollectionItem, Project, Video } from '@prisma/client'

interface VideoHeaderProps {
  fileName: string
  sceneCount: number
  collections: Array<Collection & { items: (CollectionItem & { video: Video })[] }>
  projects: Array<Project & { videos: Video[] }>
  videoSource: string
  onReindex: () => void
  onDelete: () => void
  importAt: Date
  disabled: boolean
}

export function VideoHeader({
  fileName,
  sceneCount,
  collections,
  projects,
  videoSource,
  onReindex,
  onDelete,
  importAt,
  disabled,
}: VideoHeaderProps) {
  return (
    <section className="mb-8">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-black dark:text-white mb-2">{fileName}</h1>
            <p className="text-sm text-black/50 dark:text-white/50">{sceneCount} scenes indexed</p>
            <p className="text-sm text-black/50 dark:text-white/50 mt-2">Imported at {smartFormatDate(importAt)}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onReindex}
              disabled={disabled}
              className={`
      inline-flex items-center gap-2
      px-4 py-2
      text-sm font-medium
      rounded-xl
      border
      transition-all
      ${
        disabled
          ? 'cursor-not-allowed opacity-50 border-black/10 dark:border-white/10'
          : 'border-black/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5'
      }
      text-black/80 dark:text-white/80
    `}
            >
              <ArrowPathIcon className={`h-4 w-4 ${disabled ? 'animate-spin' : ''}`} />
              {disabled ? 'Reindexing' : 'Reindex'}
            </button>
            <button
              onClick={onDelete}
              disabled={disabled}
              className={`
      inline-flex items-center gap-2
      px-4 py-2
      text-sm font-medium
      rounded-xl
      border
      transition-all
      ${disabled ? 'cursor-not-allowed opacity-50 border-red-500/20' : 'border-red-500/30 hover:bg-red-500/10'}
      text-red-600 dark:text-red-400
    `}
            >
              <TrashIcon className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>

        {(collections.length > 0 || projects.length > 0) && (
          <div className="flex flex-col gap-4 pt-6 border-t border-black/10 dark:border-white/10">
            {collections.length > 0 && (
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-medium text-black/40 dark:text-white/40 uppercase tracking-wider">
                  Collections
                </h3>
                <div className="flex flex-wrap gap-2">
                  {collections.map((collection) => (
                    <CollectionBadge
                      key={collection.id}
                      collection={{
                        ...collection,
                        confidence: collection.items.find((item) => item.video.source === videoSource)?.confidence,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {projects.length > 0 && (
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-medium text-black/40 dark:text-white/40 uppercase tracking-wider">
                  Projects
                </h3>
                <div className="flex flex-wrap gap-2">
                  {projects.map((project) => (
                    <ProjectBadge key={project.id} project={{ ...project, videos: project.videos.length }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
