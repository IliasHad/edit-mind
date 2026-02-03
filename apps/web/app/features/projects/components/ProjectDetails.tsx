import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input, Textarea } from '@headlessui/react'
import { Link, useFetcher, useNavigate } from 'react-router'
import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  VideoCameraIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  Squares2X2Icon,
  ListBulletIcon,
} from '@heroicons/react/24/outline'
import { ProjectCreateSchema, type ProjectCreateInput, type ProjectUpdateInput } from '../schemas'
import { useCurrentProject } from '../hooks/useCurrentProject'
import { useInfiniteVideos } from '../hooks/useInfiniteVideos'
import { VideoListItem } from './VideoListItem'
import { VideoGridCard } from './VideoGridCard'
import { Button } from '@ui/components/Button'
import { SelectedVideoChip } from './SelectedVideoChip'

interface ProjectDetailsProps {
  isEditing?: boolean
}

type ViewMode = 'grid' | 'list'

export function ProjectDetails({ isEditing = false }: ProjectDetailsProps) {
  const fetcher = useFetcher()
  const navigate = useNavigate()
  const { currentProject, createProject, updateProject, showSuccess } = useCurrentProject()

  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const observerTarget = useRef<HTMLDivElement>(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const {
    videos: availableVideos,
    hasMore,
    loading: videosLoading,
    loadMore,
    reset: resetVideos,
  } = useInfiniteVideos({
    initialLimit: 6,
  })

  const defaultValues = useMemo(() => {
    if (isEditing && currentProject) {
      return {
        ...currentProject,
        videoIds: currentProject.videos?.map((v) => v.id) ?? [],
      }
    }
    return { name: '', instructions: '', videoIds: [] }
  }, [isEditing, currentProject])

  const {
    handleSubmit,
    watch,
    setValue,
    control,
    reset,
    formState: { errors, isDirty, isSubmitting: formSubmitting },
  } = useForm<ProjectCreateInput | ProjectUpdateInput>({
    resolver: zodResolver(ProjectCreateSchema),
    defaultValues,
    mode: 'onChange',
  })
  const selectedVideoIds = watch('videoIds')

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  useEffect(() => {
    resetVideos(debouncedSearch)
  }, [debouncedSearch, resetVideos])

  useEffect(() => {
    if (!isEditing || !currentProject) return
    const formData = {
      name: currentProject.name,
      instructions: currentProject.instructions ?? '',
      videoIds: currentProject.videos?.map((v) => v.id) ?? [],
    }
    reset(formData)
  }, [isEditing, currentProject, reset])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !videosLoading) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )
    const currentTarget = observerTarget.current
    if (currentTarget) observer.observe(currentTarget)
    return () => {
      if (currentTarget) observer.unobserve(currentTarget)
    }
  }, [hasMore, videosLoading, loadMore])

  const selectedVideos = useMemo(() => {
    if (currentProject) {
      return currentProject?.videos
        .map((v) => {
          if (selectedVideoIds?.includes(v.id)) {
            return v
          }
          return undefined
        })
        .filter(Boolean)
    }
    return []
  }, [currentProject, selectedVideoIds])

  const toggleVideo = useCallback(
    (videoId: string) => {
      const newIds = selectedVideoIds?.includes(videoId)
        ? selectedVideoIds.filter((id) => id !== videoId)
        : [...(selectedVideoIds || []), videoId]
      setValue('videoIds', newIds, { shouldDirty: true })
    },
    [selectedVideoIds, setValue]
  )

  const removeVideo = useCallback(
    (videoId: string) => {
      setValue('videoIds', selectedVideoIds?.filter((id) => id !== videoId) ?? [], {
        shouldDirty: true,
        shouldValidate: true,
      })
    },
    [selectedVideoIds, setValue]
  )

  const onSubmit = async (data: ProjectCreateInput | ProjectUpdateInput) => {
    if (isEditing && currentProject?.id) {
      await updateProject(currentProject.id, data)
    } else {
      const project = await createProject(data)
      navigate(`/app/projects/${project?.id}`, { replace: true })
    }
  }

  const isSubmitting = fetcher.state === 'submitting' || formSubmitting
  const hasError = fetcher.data?.error
  const canSubmit = isDirty && !isSubmitting

  return (
    <div className="flex h-full w-full flex-col bg-white dark:bg-black">
      <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
        <header className="sticky top-0 z-10 border-b border-black/10 bg-white pb-4 pt-6 dark:border-white/10 dark:bg-black sm:pb-6 sm:pt-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white sm:text-3xl">
                  {isEditing ? 'Edit Project' : 'New Project'}
                </h1>
                <p className="text-sm text-black/60 dark:text-white/60">
                  {isEditing
                    ? 'Update your project details and manage video collection'
                    : 'Organize your videos into a cohesive project for better management'}
                </p>
              </div>

              {showSuccess && (
                <div className="flex shrink-0 items-center gap-2.5 rounded-full border border-green-200 bg-green-50 px-4 py-2.5 shadow-sm dark:border-green-800 dark:bg-green-950/50">
                  <CheckCircleIcon className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
                  <span className="whitespace-nowrap text-sm font-semibold text-green-700 dark:text-green-300">
                    Changes saved!
                  </span>
                </div>
              )}
            </div>
          </div>
        </header>

        {hasError && (
          <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8">
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm dark:border-red-800 dark:bg-red-950/30">
              <ExclamationCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-red-800 dark:text-red-200">Failed to save project</p>
                <p className="mt-1 wrap-break-word text-sm text-red-600 dark:text-red-400">{fetcher.data.error}</p>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8 lg:px-8">
            <section>
              <label htmlFor="name" className="mb-3 block text-sm font-semibold text-black dark:text-white">
                Project Name <span className="text-red-500">*</span>
              </label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="name"
                    placeholder="e.g., Summer Vacation 2024"
                    autoFocus={!isEditing}
                    className={`w-full rounded-xl border-2 bg-white px-4 py-3.5 text-base text-black outline-none transition-all duration-200 placeholder:text-black/40 dark:bg-black dark:text-white dark:placeholder:text-white/40 ${errors.name
                      ? 'border-red-300 focus:border-red-500 dark:border-red-800 dark:focus:border-red-600'
                      : 'border-black/10 focus:border-black/30 dark:border-white/10 dark:focus:border-white/30'
                      }`}
                  />
                )}
              />
              {errors.name && (
                <div className="mt-2 flex items-center gap-2">
                  <XMarkIcon className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
                </div>
              )}
            </section>

            <section>
              <div className="mb-3 flex items-center gap-2">
                <label htmlFor="instructions" className="text-sm font-semibold text-black dark:text-white">
                  Project Context
                </label>
                <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-xs font-medium text-black/60 dark:bg-white/5 dark:text-white/60">
                  Optional
                </span>
              </div>
              <Controller
                name="instructions"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    id="instructions"
                    placeholder="Describe your project context. Example: 'Tech conference recordings featuring keynote speakers and panel discussions about AI and machine learning.'"
                    rows={4}
                    className="w-full resize-none rounded-xl border-2 border-black/10 bg-white px-4 py-3.5 text-base text-black outline-none transition-all duration-200 placeholder:text-black/40 focus:border-black/30 dark:border-white/10 dark:bg-black dark:text-white dark:placeholder:text-white/40 dark:focus:border-white/30"
                  />
                )}
              />
              <p className="mt-2 text-xs text-black/50 dark:text-white/50">
                Provide context to help AI-powered features understand your project better
              </p>
            </section>

            <section className="rounded-2xl border border-black/10 bg-linear-to-br from-black/5 to-black/10 p-6 dark:border-white/10 dark:from-white/5 dark:to-white/10">
              <div className="mb-4 flex items-center gap-3">
                <div className="shrink-0 rounded-lg bg-black p-2 dark:bg-white">
                  <VideoCameraIcon className="h-5 w-5 text-white dark:text-black" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold text-black dark:text-white">Selected Videos</h2>
                  <p className="truncate text-xs text-black/60 dark:text-white/60">
                    {selectedVideos.length} video{selectedVideos.length !== 1 ? 's' : ''} in this project
                  </p>
                </div>
              </div>

              {selectedVideos.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedVideos
                    .filter(video => video !== undefined)
                    .map((video) => (
                      <SelectedVideoChip key={video.id} video={video} onRemove={removeVideo} />
                    ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm text-black/50 dark:text-white/50">
                    No videos selected yet. Browse and select videos below.
                  </p>
                </div>
              )}
            </section>

            <section>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-sm font-semibold text-black dark:text-white">Video Library</h2>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                    leftIcon={<Squares2X2Icon className="h-4 w-4" />}
                    aria-label="Grid view"
                  />
                  <Button
                    type="button"
                    onClick={() => setViewMode('list')}
                    variant={viewMode === 'list' ? 'primary' : 'ghost'}
                    leftIcon={<ListBulletIcon className="h-4 w-4" />}
                    aria-label="List view"
                  />
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border-2 border-black/10 bg-white dark:border-white/10 dark:bg-black">
                <div className="border-b border-black/10 bg-black/5 p-4 dark:border-white/10 dark:bg-white/5">
                  <div className="relative">
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-black/40 dark:text-white/40" />
                    <Input
                      type="text"
                      placeholder="Search by name or folder path..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-xl border border-black/10 bg-white py-3 pl-12 pr-4 text-sm text-black outline-none transition-all duration-200 placeholder:text-black/40 focus:ring-2 focus:ring-black/20 dark:border-white/10 dark:bg-black dark:text-white dark:placeholder:text-white/40 dark:focus:ring-white/20"
                    />
                  </div>
                </div>

                <div className="max-h-[600px] overflow-y-auto">
                  {availableVideos.length === 0 && !videosLoading ? (
                    <div className="p-12 text-center sm:p-16">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-black/5 dark:bg-white/5">
                        <VideoCameraIcon className="h-8 w-8 text-black/20 dark:text-white/20" />
                      </div>
                      <p className="mb-1 text-sm font-semibold text-black dark:text-white">
                        {searchQuery ? 'No videos found' : 'No videos available'}
                      </p>
                      <p className="text-xs text-black/60 dark:text-white/60">
                        {searchQuery ? 'Try adjusting your search terms' : 'Import videos to add them to your project'}
                      </p>
                    </div>
                  ) : (
                    <>
                      {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
                          {availableVideos.map((video) => (
                            <VideoGridCard
                              key={video.id}
                              video={video}
                              isSelected={selectedVideoIds?.includes(video.id)}
                              onToggle={() => toggleVideo(video.id)}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="divide-y divide-black/10 dark:divide-white/10">
                          {availableVideos.map((video) => (
                            <VideoListItem
                              key={video.id}
                              video={video}
                              isSelected={selectedVideoIds?.includes(video.id)}
                              onToggle={() => toggleVideo(video.id)}
                            />
                          ))}
                        </div>
                      )}

                      <div ref={observerTarget} className="p-4">
                        {videosLoading && (
                          <div className="flex items-center justify-center gap-2 text-black/60 dark:text-white/60">
                            <ArrowPathIcon className="h-5 w-5 animate-spin" />
                            <span className="text-sm">Loading more videos...</span>
                          </div>
                        )}
                        {!hasMore && availableVideos.length > 0 && (
                          <p className="text-center text-sm text-black/40 dark:text-white/40">All videos loaded</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </section>
          </div>
        </main>

        <footer className="sticky bottom-0 border-t border-black/10 bg-white py-4 dark:border-white/10 dark:bg-black sm:py-6">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <Link to="/app/projects">
              <Button type="button" disabled={isSubmitting} variant="ghost">
                Cancel
              </Button>
            </Link>

            <div className="flex items-center justify-end gap-3 sm:gap-4">
              {isDirty && !isSubmitting && (
                <div className="flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 dark:border-orange-800 dark:bg-orange-950/30">
                  <div className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-orange-500" />
                  <span className="whitespace-nowrap text-xs font-medium text-orange-700 dark:text-orange-300">
                    Unsaved changes
                  </span>
                </div>
              )}
              <Button
                type="submit"
                disabled={!canSubmit}
                loading={isSubmitting}
                leftIcon={isSubmitting ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : null}
              >
                {isEditing ? 'Save Changes' : 'Create Project'}
              </Button>
            </div>
          </div>
        </footer>
      </form>
    </div>
  )
}
