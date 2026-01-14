import { useForm } from 'react-hook-form'
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
} from '@heroicons/react/24/outline';
import { ProjectCreateSchema, type ProjectCreateInput, type ProjectUpdateInput } from '../schemas'
import { useCurrentProject } from '../hooks/useCurrentProject'
import { useInfiniteVideos } from '../hooks/useInfiniteVideos'
import { VideoListItem } from './VideoListItem'
import { VideoGridCard } from './VideoGridCard'

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

  const {
    videos: availableVideos,
    hasMore,
    loading: videosLoading,
    loadMore,
    reset: resetVideos,
  } = useInfiniteVideos()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty, isValid },
  } = useForm<ProjectCreateInput | ProjectUpdateInput>({
    resolver: zodResolver(ProjectCreateSchema),
    defaultValues: currentProject
      ? { ...currentProject, videoIds: currentProject?.videos.map((video) => video.id) }
      : { name: '', instructions: '', videoIds: [] },
    mode: 'onChange',
  })

  const selectedVideoIds = watch('videoIds')

  useEffect(() => {
    resetVideos(searchQuery)
  }, [searchQuery, resetVideos])

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
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasMore, videosLoading, loadMore])

  useEffect(() => {
    if (currentProject) {
      reset({ ...currentProject, videoIds: currentProject.videos.map((v) => v.id) })
    }
  }, [currentProject, reset])



  const selectedVideos = useMemo(
    () => availableVideos.filter((v) => selectedVideoIds?.includes(v.id)),
    [availableVideos, selectedVideoIds]
  )

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
      setValue(
        'videoIds',
        selectedVideoIds?.filter((id) => id !== videoId),
        { shouldDirty: true, shouldValidate: true }
      )
    },
    [selectedVideoIds, setValue]
  )

  const onSubmit = async (data: ProjectCreateInput | ProjectUpdateInput) => {
    if (isEditing && currentProject?.id) {
      await updateProject(currentProject?.id, data)
    } else {
      const project = await createProject(data)
      navigate(`/app/projects/${project?.id}`, { replace: true })
    }
  }

  const isSubmitting = fetcher.state === 'submitting'
  const hasError = fetcher.data?.error
  const canSubmit = isValid && isDirty && !isSubmitting

  return (
    <div className="max-w-7xl mx-auto h-full bg-white dark:bg-black">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
        {/* Header */}
        <div className="sticky top-0 z-10 px-8 pt-8 pb-6 bg-white dark:bg-black border-b border-black/10 dark:border-white/10">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-3xl font-bold tracking-tight text-black dark:text-white mb-2">
                {isEditing ? 'Edit Project' : 'New Project'}
              </h2>
              <p className="text-sm text-black/60 dark:text-white/60 max-w-2xl">
                {isEditing
                  ? 'Update your project details and manage video collection'
                  : 'Organize your videos into a cohesive project for better management'}
              </p>
            </div>

            {showSuccess && (
              <div className="flex items-center gap-2.5 px-4 py-2.5 bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded-full shadow-sm">
                <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span className="text-sm font-semibold text-green-700 dark:text-green-300">Changes saved!</span>
              </div>
            )}
          </div>
        </div>

        {hasError && (
          <div className="mx-8 mt-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3 shadow-sm">
            <ExclamationCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800 dark:text-red-200">Failed to save project</p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{fetcher.data.error}</p>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <div className="px-8 py-8 space-y-8">
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-black dark:text-white mb-3">
                Project Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="name"
                {...register('name')}
                placeholder="e.g., Summer Vacation 2024"
                autoFocus={!isEditing}
                className={`w-full px-4 py-3.5 text-base rounded-xl
                         bg-white dark:bg-black
                         text-black dark:text-white
                         border-2 transition-all duration-200 outline-none
                         placeholder:text-black/40 dark:placeholder:text-white/40
                         ${
                           errors.name
                             ? 'border-red-300 dark:border-red-800 focus:border-red-500 dark:focus:border-red-600'
                             : 'border-black/10 dark:border-white/10 focus:border-black/30 dark:focus:border-white/30'
                         }`}
              />
              {errors.name && (
                <div className="flex items-center gap-2 mt-2">
                  <XMarkIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <label htmlFor="instructions" className="text-sm font-semibold text-black dark:text-white">
                  Project Context
                </label>
                <span className="px-2 py-0.5 text-xs font-medium text-black/60 dark:text-white/60 bg-black/5 dark:bg-white/5 rounded-full">
                  Optional
                </span>
              </div>
              <Textarea
                id="instructions"
                {...register('instructions')}
                placeholder="Describe your project context. Example: 'Tech conference recordings featuring keynote speakers and panel discussions about AI and machine learning.'"
                rows={4}
                className="w-full px-4 py-3.5 text-base rounded-xl
                         bg-white dark:bg-black
                         text-black dark:text-white
                         border-2 border-black/10 dark:border-white/10
                         focus:border-black/30 dark:focus:border-white/30
                         placeholder:text-black/40 dark:placeholder:text-white/40
                         transition-all duration-200
                         outline-none resize-none"
              />
              <p className="mt-2 text-xs text-black/50 dark:text-white/50">
                Provide context to help AI-powered features understand your project better
              </p>
            </div>

            <div className="p-6 bg-linear-to-br from-black/5 to-black/10 dark:from-white/5 dark:to-white/10 rounded-2xl border border-black/10 dark:border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-black dark:bg-white rounded-lg">
                    <VideoCameraIcon className="w-5 h-5 text-white dark:text-black" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-black dark:text-white">Selected Videos</h3>
                    <p className="text-xs text-black/60 dark:text-white/60">
                      {selectedVideos.length} video{selectedVideos.length !== 1 ? 's' : ''} in this project
                    </p>
                  </div>
                </div>
              </div>

              {selectedVideos.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedVideos.map((video) => (
                    <div
                      key={video.id}
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
                      <button
                        type="button"
                        onClick={() => removeVideo(video.id)}
                        className="p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30
                                   text-black/40 hover:text-red-600 dark:text-white/40 dark:hover:text-red-400
                                   transition-all duration-200"
                        aria-label={`Remove ${video.name}`}
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-black/50 dark:text-white/50">
                    No videos selected yet. Browse and select videos below.
                  </p>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-black dark:text-white">Video Library</h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-all duration-200 ${
                      viewMode === 'grid'
                        ? 'bg-black dark:bg-white text-white dark:text-black'
                        : 'text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                    aria-label="Grid view"
                  >
                    <Squares2X2Icon className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-all duration-200 ${
                      viewMode === 'list'
                        ? 'bg-black dark:bg-white text-white dark:text-black'
                        : 'text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                    aria-label="List view"
                  >
                    <ListBulletIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="border-2 border-black/10 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-black">
                <div className="p-4 bg-black/5 dark:bg-white/5 border-b border-black/10 dark:border-white/10">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/40 dark:text-white/40" />
                    <Input
                      type="text"
                      placeholder="Search by name or folder path..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 text-sm
                               bg-white dark:bg-black
                               text-black dark:text-white
                               placeholder:text-black/40 dark:placeholder:text-white/40
                               border border-black/10 dark:border-white/10
                               rounded-xl
                               focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20
                               transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="max-h-[600px] overflow-y-auto">
                  {availableVideos.length === 0 && !videosLoading ? (
                    <div className="p-16 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center">
                        <VideoCameraIcon className="w-8 h-8 text-black/20 dark:text-white/20" />
                      </div>
                      <p className="text-sm font-semibold text-black dark:text-white mb-1">
                        {searchQuery ? 'No videos found' : 'No videos available'}
                      </p>
                      <p className="text-xs text-black/60 dark:text-white/60">
                        {searchQuery ? 'Try adjusting your search terms' : 'Import videos to add them to your project'}
                      </p>
                    </div>
                  ) : (
                    <>
                      {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                          {availableVideos.map((video) => {
                            const isSelected = selectedVideoIds?.includes(video.id)
                            return (
                              <VideoGridCard
                                key={video.id}
                                video={video}
                                isSelected={isSelected}
                                onToggle={() => toggleVideo(video.id)}
                              />
                            )
                          })}
                        </div>
                      ) : (
                        <div>
                          {availableVideos.map((video) => {
                            const isSelected = selectedVideoIds?.includes(video.id)
                            return (
                              <VideoListItem
                                key={video.id}
                                video={video}
                                isSelected={isSelected}
                                onToggle={() => toggleVideo(video.id)}
                              />
                            )
                          })}
                        </div>
                      )}

                      <div ref={observerTarget} className="p-4">
                        {videosLoading && (
                          <div className="flex items-center justify-center gap-2 text-black/60 dark:text-white/60">
                            <ArrowPathIcon className="w-5 h-5 animate-spin" />
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
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 px-8 py-6 bg-white dark:bg-black border-t border-black/10 dark:border-white/10 flex items-center justify-between">
          <Link to="/app/projects">
            <button
              type="button"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-sm font-medium rounded-full
                         text-black/70 dark:text-white/70
                         hover:bg-black/10 dark:hover:bg-white/10
                         disabled:opacity-40 disabled:cursor-not-allowed
                         transition-all duration-200"
            >
              Cancel
            </button>
          </Link>

          <div className="flex items-center gap-4">
            {isDirty && !isSubmitting && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                <span className="text-xs font-medium text-orange-700 dark:text-orange-300">Unsaved changes</span>
              </div>
            )}
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-8 py-3 text-sm font-semibold rounded-full
                       bg-black dark:bg-white
                       text-white dark:text-black
                       hover:bg-black/90 dark:hover:bg-white/90
                       disabled:opacity-40 disabled:cursor-not-allowed
                       transition-all duration-200
                       min-w-40 flex items-center justify-center gap-2
                       shadow-lg shadow-black/20 dark:shadow-white/10
                       hover:shadow-xl hover:shadow-black/30 dark:hover:shadow-white/20"
            >
              {isSubmitting ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  <span>{isEditing ? 'Saving...' : 'Creating...'}</span>
                </>
              ) : (
                <span>{isEditing ? 'Save Changes' : 'Create Project'}</span>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
