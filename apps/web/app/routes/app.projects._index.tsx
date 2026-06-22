import { Link } from 'react-router'
import type { MetaFunction } from 'react-router'
import { useTranslation } from 'react-i18next'
import { translate } from '~/i18n/translate'
import { DashboardLayout } from '~/layouts/DashboardLayout'
import { Sidebar } from '~/features/shared/components/Sidebar'
import { ProjectCard } from '~/features/projects/components/ProjectCard'
import { useProjects } from '~/features/projects/hooks/useProjects'
import { ChatBubbleLeftIcon, MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/solid'
import { useState } from 'react'
import { Button } from '@ui/components/Button'

export const meta: MetaFunction = () => {
  return [{ title: translate('projects.meta.indexTitle') }]
}

export default function ProjectsIndexPage() {
  const { t } = useTranslation()
  const { projects } = useProjects()
  const [searchQuery, setSearchQuery] = useState('')

  const filteredProjects =
    searchQuery.trim().length > 0
      ? projects.filter((project) => project.name?.toLowerCase().includes(searchQuery.toLowerCase()))
      : projects

  const hasProjects = projects.length > 0

  return (
    <DashboardLayout sidebar={<Sidebar />}>
      <main className="h-full">
        {!hasProjects ? (
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4">
            <div className="w-20 h-20 mb-6 rounded-3xl bg-linear-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center shadow-sm">
              <ChatBubbleLeftIcon className="w-10 h-10 text-zinc-400 dark:text-zinc-500" />
            </div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-2 text-center">{t('projects.index.emptyTitle')}</h1>
            <p className="text-zinc-600 dark:text-zinc-400 text-center max-w-md mb-8">
              {t('projects.index.emptyDescription')}
            </p>
            <Link to="/app/projects/new">
              <Button leftIcon={<PlusIcon className="w-4 h-4" />} size="sm">
                {t('projects.index.startNew')}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">{t('projects.index.title')}</h1>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                    {projects.length} {projects.length === 1 ? t('projects.index.project') : t('projects.index.projects')}
                  </p>
                </div>
                <Link to="/app/projects/new">
                  <Button leftIcon={<PlusIcon className="w-4 h-4" />} size="sm">
                    {t('projects.index.newProject')}
                  </Button>
                </Link>
              </div>

              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="text"
                  placeholder={t('projects.index.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white focus:border-transparent transition-shadow"
                />
              </div>
            </div>

            {searchQuery.trim().length > 0 && filteredProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="w-16 h-16 mb-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <MagnifyingGlassIcon className="w-8 h-8 text-zinc-400" />
                </div>
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-1">{t('projects.index.noResultsTitle')}</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{t('projects.index.noResultsDescription')}</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredProjects.map((project) => (
                  <ProjectCard key={project.id} {...project} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </DashboardLayout>
  )
}
