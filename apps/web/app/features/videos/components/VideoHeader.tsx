import { ArrowPathIcon, TrashIcon, CalendarIcon, FilmIcon } from '@heroicons/react/24/outline'
import { CollectionBadge } from '~/features/collections/components/CollectionBadge'
import { ProjectBadge } from '~/features/projects/components/ProjectBadge'
import { smartFormatDate } from '@shared/utils/duration'
import type { CollectionItemsWithNameAndId, ProjectWithIdAndName } from '../types'

interface VideoHeaderProps {
  fileName: string
  sceneCount: number
  collectionItems: CollectionItemsWithNameAndId[] 
  projects: ProjectWithIdAndName[]
  source: string
  onReindex: () => void
  onDelete: () => void
  importAt: Date
  disabled: boolean
}

export function VideoHeader({
  fileName,
  sceneCount,
  collectionItems,
  projects,
  onReindex,
  onDelete,
  importAt,
  disabled,
}: VideoHeaderProps) {
  return (
    <section className="mb-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div className="flex-1 space-y-3">
            <h1 className="text-3xl font-bold text-black dark:text-white tracking-tight">
              {fileName}
            </h1>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                <FilmIcon className="h-4 w-4 text-black/60 dark:text-white/60" />
                <span className="text-sm font-medium text-black/70 dark:text-white/70">
                  {sceneCount} scenes
                </span>
              </div>
              
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                <CalendarIcon className="h-4 w-4 text-black/60 dark:text-white/60" />
                <span className="text-sm font-medium text-black/70 dark:text-white/70">
                  {smartFormatDate(importAt)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:pt-1">
            <button
              onClick={onReindex}
              disabled={disabled}
              className={`
                group
                inline-flex items-center gap-2
                px-4 py-2.5
                text-sm font-medium
                rounded-xl
                border
                transition-all duration-200
                ${
                  disabled
                    ? 'cursor-not-allowed opacity-50 bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10'
                    : 'border-black/20 dark:border-white/20 hover:border-black/30 dark:hover:border-white/30 hover:bg-black/5 dark:hover:bg-white/5 hover:shadow-sm'
                }
                text-black dark:text-white
              `}
            >
              <ArrowPathIcon 
                className={`h-4 w-4 transition-transform ${
                  disabled ? 'animate-spin' : 'group-hover:rotate-180 duration-500'
                }`} 
              />
              {disabled ? 'Reindexing...' : 'Reindex'}
            </button>
            
            <button
              onClick={onDelete}
              disabled={disabled}
              className={`
                group
                inline-flex items-center gap-2
                px-4 py-2.5
                text-sm font-medium
                rounded-xl
                border
                transition-all duration-200
                ${
                  disabled 
                    ? 'cursor-not-allowed opacity-50 bg-red-500/5 border-red-500/20' 
                    : 'border-red-500/30 hover:border-red-500/50 hover:bg-red-500/10 hover:shadow-sm'
                }
                text-red-600 dark:text-red-400
              `}
            >
              <TrashIcon className="h-4 w-4 group-hover:scale-110 transition-transform" />
              Delete
            </button>
          </div>
        </div>

        {collectionItems.length > 0 && (
          <div className="flex flex-col gap-4 pt-6 border-t border-black/10 dark:border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-black/50 dark:text-white/50 uppercase tracking-wider">
                Collections
              </h3>
              <span className="text-xs font-medium text-black/40 dark:text-white/40">
                {collectionItems.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {collectionItems.map((collectionItem) => (
                <CollectionBadge
                  key={collectionItem.collection.id}
                  collection={{
                    name: collectionItem.collection.name,
                    id: collectionItem.collection.id,
                    confidence: collectionItem.confidence,
                    type: collectionItem.collection.type
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {projects.length > 0 && (
          <div className="flex flex-col gap-4 pt-6 border-t border-black/10 dark:border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-black/50 dark:text-white/50 uppercase tracking-wider">
                Projects
              </h3>
              <span className="text-xs font-medium text-black/40 dark:text-white/40">
                {projects.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {projects.map((project) => (
                <ProjectBadge 
                  key={project.id} 
                  project={{ name: project.name, videos: 0, id: project.id }} 
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}