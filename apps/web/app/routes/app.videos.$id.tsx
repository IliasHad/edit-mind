import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { DashboardLayout } from '~/layouts/DashboardLayout'
import { Sidebar } from '~/features/shared/components/Sidebar'
import { ActiveSceneCard } from '~/features/videos/components/ActiveSceneCard'
import { ScenesSidebar } from '~/features/videos/components/ScenesSidebar'
import { useKeyboardNavigation } from '~/features/videos/hooks/useKeyboardNavigation'
import { useModal } from '~/features/shared/hooks/useModal'
import { useCurrentVideo } from '~/features/videos/hooks/useCurrentVideo'
import { CustomVideoPlayer } from '~/features/customVideoPlayer/components'
import { DeleteModal } from '~/features/shared/components/DeleteModal'
import { VideoHeader } from '~/features/videos/components/VideoHeader'
import { ProcessingJobDetails } from '~/features/videos/components/ProcessingJobDetails'
import { ConfirmModal } from '~/features/shared/components/ConfirmationModal'
import { RelinkVideo } from '~/features/videos/components/RelinkVideo'
import { PageSkeleton } from '~/features/videos/components/PageSkeleton'

export const meta = () => {
  return [
    {
      title: 'Videos | Edit Mind',
    },
  ]
}

export default function Video() {
  const {
    currentVideo: video,
    currentScenes: scenes,
    isProcessing,
    currentProcessedJob,
    deleteVideoById,
    relinkVideo,
    reindexVideo,
    relinkSuccess,
    videoExist,
    loading,
  } = useCurrentVideo()

  const { id } = useParams()

  const [searchParams] = useSearchParams()
  const [defaultStartTime, setDefaultStartTime] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [activeScene, setActiveScene] = useState(scenes[0])

  const { isOpen: reindexModalOpen, closeModal: closeReindexModal, openModal: openReindexModal } = useModal()

  const { isOpen: deleteModalOpen, closeModal: closeDeleteModal, openModal: openDeleteModal } = useModal()

  const { isOpen: relinkModalOpen, closeModal: closeRelinkModal, openModal: openRelinkModal } = useModal()

  const handleSceneClick = (scene: typeof activeScene) => {
    setActiveScene(scene)
    setDefaultStartTime(scene.startTime + 0.1)
  }

  useEffect(() => {
    if (searchParams.has('startTime')) {
      setDefaultStartTime(parseInt(searchParams.get('startTime') || '0'))
    }
  }, [searchParams])

  useKeyboardNavigation({
    activeScene,
    scenes: scenes,
    onSceneChange: (scene) => {
      setActiveScene(scene)
      setDefaultStartTime(scene.startTime)
    },
  })

  useEffect(() => {
    const time = Math.round(currentTime * 100) / 100
    const scene = scenes.find((scene) => time >= scene.startTime && time <= scene.endTime)
    if (scene) {
      setActiveScene(scene)
    }
  }, [currentTime, scenes])

  const handleDelete = async () => {
    try {
      if (id) {
        await deleteVideoById(id)
      }
    } catch (error) {
      console.error('Error deleting video ', error)
    }
  }

  const handleReindex = async () => {
    try {
      if (id) {
        await reindexVideo(id)
      }
    } catch (error) {
      console.error('Error reindexing video ', error)
    }
  }

  const handleRelink = async (newSource: string) => {
    try {
      if (id) {
        await relinkVideo(id, newSource)
      }
    } catch (error) {
      console.error('Error relink video ', error)
    }
  }

  if (loading) return <PageSkeleton />

  return (
    <DashboardLayout sidebar={<Sidebar />}>
      <main className="max-w-7xl mx-auto px-6 py-12">
        {video && (
          <VideoHeader
            fileName={video?.source.split('/').pop() || ''}
            sceneCount={scenes.length}
            collectionItems={video.collectionItems}
            projects={video.projects}
            onReindex={() => openReindexModal()}
            onDelete={() => openDeleteModal()}
            importAt={video.importAt}
            disabled={isProcessing}
            source={video.source}
            shottedAt={video.shottedAt}
          />
        )}
        {video && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 flex flex-col gap-6">
              <DeleteModal
                isOpen={deleteModalOpen}
                onClose={closeDeleteModal}
                title="Delete video"
                description="Removing this video will remove all indexed data. This action cannot be undone."
                resourceName={video.source}
                confirmText="Delete folder"
                onConfirm={handleDelete}
              />
              <ConfirmModal
                isOpen={reindexModalOpen}
                onClose={closeReindexModal}
                title="Reindex video"
                description="Removing this video will remove all indexed data. This action cannot be undone."
                resourceName={video.source}
                confirmText="Reindex folder"
                onConfirm={handleReindex}
              />

              <RelinkVideo
                onRelink={handleRelink}
                oldSource={video.source}
                onClose={closeRelinkModal}
                isOpen={relinkModalOpen}
                relinkSuccess={relinkSuccess}
              />

              {isProcessing && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/30 rounded-lg">
                  <div className="size-2 bg-blue-500 rounded-full animate-pulse" />
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                    We have processing video job for this video, the details of this video will be updated once all jobs
                    is completed
                  </span>
                </div>
              )}
              {videoExist ? (
                <CustomVideoPlayer
                  source={'/media?source=' + encodeURIComponent(video.source)}
                  scenes={scenes}
                  title={video.source}
                  defaultStartTime={defaultStartTime}
                  onTimeUpdate={setCurrentTime}
                />
              ) : (
                <div className="p-4 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 dark:border-amber-500/20 rounded-xl flex items-center justify-between">
                  <span className="text-sm text-amber-900 dark:text-amber-100">
                    Video file is missing. Please relink.
                  </span>
                  <button
                    onClick={() => openRelinkModal()}
                    className="px-4 py-2 text-sm font-medium bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Relink
                  </button>
                </div>
              )}

              {activeScene && <ActiveSceneCard scene={activeScene} />}

              {currentProcessedJob && <ProcessingJobDetails job={currentProcessedJob} />}
            </div>

            <ScenesSidebar scenes={scenes} activeScene={activeScene} onSceneClick={handleSceneClick} />
          </div>
        )}
      </main>
    </DashboardLayout>
  )
}
