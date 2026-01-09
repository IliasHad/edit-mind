import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input, Textarea } from '@headlessui/react'
import { Link, useFetcher, useNavigate } from 'react-router'
import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  VideoCameraIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/solid'
import { ProjectCreateSchema, type ProjectCreateInput, type ProjectUpdateInput } from '../schemas'
import { humanizeSeconds } from '~/features/shared/utils/duration'
import { useCurrentProject } from '../hooks/useCurrentProject'

interface ProjectDetailsProps {
  isEditing?: boolean
}

export function ProjectDetails({ isEditing = false }: ProjectDetailsProps) {
  const fetcher = useFetcher()
  const navigate = useNavigate()
  const { currentProject, availableVideos, createProject, updateProject, showSuccess } = useCurrentProject()

  const [searchQuery, setSearchQuery] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty, isValid },
  } = useForm<ProjectCreateInput | ProjectUpdateInput>({
    resolver: zodResolver(ProjectCreateSchema),
    defaultValues: currentProject || { name: '', instructions: '', videoIds: [] },
    mode: 'onChange',
  })

  const selectedVideoIds = watch('videoIds')

  useEffect(() => {
    if (currentProject) {
      reset(currentProject)
    }
  }, [currentProject, reset])

  const filteredVideos = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return availableVideos
    return availableVideos.filter(
      (video) => video.name.toLowerCase().includes(query) || video.folder.path.toLowerCase().includes(query)
    )
  }, [availableVideos, searchQuery])

  const selectedVideos = useMemo(
    () => availableVideos.filter((v) => selectedVideoIds?.includes(v.id)),
    [availableVideos, selectedVideoIds]
  )

  const toggleVideo = useCallback(
    (videoId: string) => {
      const newIds = selectedVideoIds?.includes(videoId)
        ? selectedVideoIds.filter((id) => id !== videoId)
        : selectedVideoIds
          ? [...selectedVideoIds, videoId]
          : selectedVideoIds

      setValue('videoIds', newIds, { shouldDirty: true, shouldValidate: true })
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
    <div className="max-w-6xl h-full p-0 bg-white dark:bg-black overflow-hidden">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
        <div className="px-8 pt-8 pb-6 border-b border-black/10 dark:border-white/10">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-black dark:text-white mb-2">
                {isEditing ? 'Edit Project' : 'New Project'}
              </h2>
              <p className="text-sm text-black/60 dark:text-white/60">
                {isEditing ? 'Update your project details' : 'Create a collection of videos to organize your content'}
              </p>
            </div>
            {showSuccess && (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-full">
                <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-700 dark:text-green-300">Saved!</span>
              </div>
            )}
          </div>
        </div>

        {hasError && (
          <div className="mx-8 mt-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
            <ExclamationCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-200">Failed to save project</p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{fetcher.data.error}</p>
            </div>
          </div>
        )}

        <div className="px-8 py-6 border-t border-black/10 dark:border-white/10 flex items-center justify-between">
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
              <span className="text-xs text-black/50 dark:text-white/50">Unsaved changes</span>
            )}
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-8 py-2.5 text-sm font-semibold rounded-full
                       bg-black dark:bg-white
                       text-white dark:text-black
                       hover:bg-black/80 dark:hover:bg-white/90
                       disabled:opacity-40 disabled:cursor-not-allowed
                       transition-all duration-200
                       min-w-[140px] flex items-center justify-center gap-2
                       shadow-lg shadow-black/10 dark:shadow-white/10"
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
        <div className="flex-1 px-8 py-8 space-y-8 overflow-y-auto">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-black dark:text-white mb-3">
              Project Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="name"
              {...register('name')}
              placeholder="e.g., Family Trip"
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
                Instructions
              </label>
              <span className="px-2 py-0.5 text-xs font-medium text-black/60 dark:text-white/60 bg-black/5 dark:bg-white/5 rounded-full">
                Optional
              </span>
            </div>
            <Textarea
              id="instructions"
              {...register('instructions')}
              placeholder="Provide context or guidelines for AI-powered features. For example: 'This is a Youtube channel videos with technical content hosted by X '"
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
              These instructions help AI understand your project's context
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-sm font-semibold text-black dark:text-white">Selected Videos</span>
              </div>
            </div>

            {selectedVideos.length > 0 && (
              <div className="mb-4 p-4 bg-black/5 dark:bg-white/5 rounded-xl border border-black/10 dark:border-white/10">
                <div className="flex flex-wrap gap-2">
                  {selectedVideos.map((video) => (
                    <div
                      key={video.id}
                      className="inline-flex items-center gap-2 px-3 py-2
                                 bg-white dark:bg-black
                                 border border-black/10 dark:border-white/10
                                 rounded-lg
                                 group hover:border-black/20 dark:hover:border-white/20
                                 transition-all duration-200"
                    >
                      <span className="text-sm font-medium text-black dark:text-white max-w-[200px] truncate">
                        {video.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeVideo(video.id)}
                        className="p-0.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10
                                   text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white
                                   transition-colors duration-200"
                        aria-label={`Remove ${video.name}`}
                      >
                        <XMarkIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-2 border-black/10 dark:border-white/10 rounded-xl overflow-hidden">
              <div className="p-4 bg-black/5 dark:bg-white/5 border-b border-black/10 dark:border-white/10">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40 dark:text-white/40" />
                  <Input
                    type="text"
                    placeholder="Search videos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm
                               bg-white dark:bg-black
                               text-black dark:text-white
                               placeholder:text-black/40 dark:placeholder:text-white/40
                               border border-black/10 dark:border-white/10
                               rounded-lg
                               focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 focus:ring-offset-0
                               transition-all duration-200"
                  />
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto bg-white dark:bg-black">
                {filteredVideos.length === 0 ? (
                  <div className="p-16 text-center">
                    <VideoCameraIcon className="w-12 h-12 mx-auto mb-4 text-black/20 dark:text-white/20" />
                    <p className="text-sm font-medium text-black dark:text-white mb-1">
                      {searchQuery ? 'No videos found' : 'No videos available'}
                    </p>
                    <p className="text-xs text-black/60 dark:text-white/60">
                      {searchQuery ? 'Try a different search term' : 'Upload videos to add them to your project'}
                    </p>
                  </div>
                ) : (
                  <div>
                    {filteredVideos.map((video) => {
                      const isSelected = selectedVideoIds?.includes(video.id)

                      return (
                        <button
                          key={video.id}
                          type="button"
                          onClick={() => toggleVideo(video.id)}
                          className={`
                              w-full p-4 flex items-center gap-4
                              border-b border-black/5 dark:border-white/5 last:border-0
                              transition-all duration-200 text-left
                              ${isSelected ? 'bg-black/5 dark:bg-white/5' : ''}
                            `}
                          aria-label={`${isSelected ? 'Deselect' : 'Select'} ${video.name}`}
                        >
                          <div
                            className={`
                              w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0
                              transition-all duration-200
                              ${
                                isSelected
                                  ? 'bg-black dark:bg-white border-black dark:border-white scale-100'
                                  : 'border-black/30 dark:border-white/30 scale-100 hover:scale-110'
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
                                className="w-24 h-14 object-cover"
                                loading="lazy"
                              />
                              {video.duration && (
                                <span className="absolute bottom-1 right-1 px-1.5 py-0.5 text-xs font-medium text-white bg-black/70 rounded">
                                  {humanizeSeconds(parseInt(video.duration.toString()))}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-black dark:text-white truncate">{video.name}</p>
                            {video.folder.path && (
                              <p className="text-xs text-black/60 dark:text-white/60 mt-1">{video.folder.path}</p>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
