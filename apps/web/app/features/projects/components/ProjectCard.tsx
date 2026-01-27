import { CalendarIcon, FilmIcon } from '@heroicons/react/24/outline'
import { smartFormatDate } from '@shared/utils/duration'
import clsx from 'clsx'
import { Link } from 'react-router'
import { useModal } from '~/features/shared/hooks/useModal'
import { DeleteModal } from '@ui/components/DeleteModal'
import { useCurrentProject } from '../hooks/useCurrentProject'
import { Button } from '@ui/components/Button'
import { TrashIcon } from '@heroicons/react/24/solid'

interface ProjectCardProps {
  id: string
  name: string
  _count?: {
    videos: number
  }
  createdAt: Date
  className?: string
}

export function ProjectCard({ id, name, _count, createdAt, className }: ProjectCardProps) {
  const { isOpen, openModal, closeModal } = useModal()

  const { deleteProject } = useCurrentProject()

  const handleDelete = async () => {
    await deleteProject(id)
    closeModal()
  }
  return (
    <>
      <Link to={`/app/projects/${id}`} aria-label={`View ${name} project`} className="block group">
        <div
          className={clsx(
            'relative bg-white dark:bg-black',
            'rounded-xl p-5 border border-black/10 dark:border-white/10',
            'transition-all duration-200',
            'hover:border-black/20 dark:hover:border-white/20',
            'hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-white/5',
            'cursor-pointer',
            className
          )}
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-black dark:text-white truncate mb-1 transition-colors">
                {name}
              </h3>
              <div className="flex items-center gap-2 text-sm text-black/60 dark:text-white/60">
                <FilmIcon className="w-4 h-4" />
                <span>
                  {_count?.videos || 0} {_count?.videos === 1 ? 'video' : 'videos'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-black/5 dark:border-white/5">
            <div className="flex items-center gap-1.5 text-xs text-black/50 dark:text-white/50">
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>{smartFormatDate(createdAt)}</span>
            </div>

            <div className="flex items-center gap-4">
              <Button
                variant="destructive"
                onClick={(e) => {
                  e.preventDefault()
                  openModal()
                }}
                aria-label="Delete project"
                leftIcon={<TrashIcon className="size-4" />}
              >
                Delete
              </Button>
            </div>
          </div>

          <div className="absolute inset-0 rounded-xl bg-linear-to-br from-black/2 to-transparent dark:from-white/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
        </div>
      </Link>

      <DeleteModal
        isOpen={isOpen}
        onClose={closeModal}
        onConfirm={handleDelete}
        title="Delete project"
        description="Are you sure you want to delete this project? This action cannot be undone."
        resourceName={name || 'Untitled project'}
        confirmText="Confirm"
      />
    </>
  )
}
