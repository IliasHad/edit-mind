import { ArrowPathIcon, TrashIcon, CalendarIcon, FilmIcon, VideoCameraIcon } from '@heroicons/react/24/outline'
import { CollectionBadge } from '~/features/collections/components/CollectionBadge'
import { ProjectBadge } from '~/features/projects/components/ProjectBadge'
import { smartFormatDate } from '@shared/utils/duration'
import { motion } from 'framer-motion'
import type { CollectionItemsWithNameAndId, ProjectWithIdAndName } from '../types'
import { Button } from '@ui/components/Button'

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
  shottedAt: Date
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
  shottedAt,
}: VideoHeaderProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-8"
    >
      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div className="flex-1 space-y-4">
            <h1 className="text-3xl font-bold text-white tracking-tight">{fileName}</h1>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                <FilmIcon className="h-4 w-4 text-white/60" />
                <span className="text-sm font-medium text-white/70">{sceneCount} scenes</span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                <CalendarIcon className="h-4 w-4 text-white/60" />
                <span className="text-sm font-medium text-white/70">Imported {smartFormatDate(importAt)}</span>
              </div>

              {shottedAt && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                  <VideoCameraIcon className="h-4 w-4 text-white/60" />
                  <span className="text-sm font-medium text-white/70">Shot {smartFormatDate(shottedAt)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:pt-1 shrink-0">
            <Button
              onClick={onReindex}
              disabled={disabled}
              variant="glass"
              leftIcon={
                <ArrowPathIcon
                  className={`h-4 w-4 transition-transform ${
                    disabled ? 'animate-spin' : 'group-hover:rotate-180 duration-500'
                  }`}
                />
              }
            >
              {disabled ? 'Reindexing...' : 'Reindex'}
            </Button>

            <Button
              onClick={onDelete}
              disabled={disabled}
              leftIcon={<TrashIcon className="h-4 w-4 group-hover:scale-110 transition-transform" />}
              variant="destructive"
            >
              Delete
            </Button>
          </div>
        </div>
      </div>

      {collectionItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="px-6 py-4 border-t border-white/5"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Collections</h3>
            <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-white/60">
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
                  type: collectionItem.collection.type,
                }}
              />
            ))}
          </div>
        </motion.div>
      )}

      {projects.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="px-6 py-4 border-t border-white/5"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Projects</h3>
            <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-white/60">
              {projects.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {projects.map((project) => (
              <ProjectBadge key={project.id} project={{ name: project.name, videos: 0, id: project.id }} />
            ))}
          </div>
        </motion.div>
      )}
    </motion.section>
  )
}
