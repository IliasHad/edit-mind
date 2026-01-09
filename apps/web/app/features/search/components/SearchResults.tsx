import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { VideoCard } from '~/features/search/components/VideoCard'
import type { VideoWithScenesAndMatch } from '@shared/types/video'

interface SearchResultsProps {
  results: VideoWithScenesAndMatch[]
  total: number
  isLoading: boolean
  hasQuery: boolean
}

export function SearchResults({ results, total, isLoading, hasQuery }: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-2">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 rounded-full border-2 border-black/10 dark:border-white/10 border-t-black dark:border-t-white animate-spin" />
          <p className="text-sm text-black/60 dark:text-white/60">Searching scenes...</p>
        </div>
      </div>
    )
  }

  if (results.length === 0 && hasQuery) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-2">
        <div className="rounded-3xl p-12 max-w-lg">
          <div className="size-24 mx-auto mb-6 rounded-full flex items-center justify-center">
            <MagnifyingGlassIcon className="size-10 text-white" />
          </div>
          <h4 className="text-xl font-semibold text-black dark:text-white mb-3">No scenes found</h4>
          <p className="text-black/60 dark:text-white/60 text-base leading-relaxed">
            Try adjusting your search terms or filters
          </p>
        </div>
      </div>
    )
  }

  if (results.length > 0) {
    return (
      <div className="space-y-8 mx-auto">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-semibold text-black dark:text-white">Search Results</h3>
            <p className="text-sm text-black/50 dark:text-white/50 mt-1">
              {total} {total === 1 ? 'video' : 'videos'} total
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-[200px]">
          {results.map((video) => (
            <VideoCard
              key={video.source}
              source={video.source}
              thumbnailUrl={video.thumbnailUrl || video.scenes[0].thumbnailUrl}
              duration={video.duration ?? 0}
              createdAt={video.createdAt}
              metadata={{
                faces: video.faces,
                objects: video.objects,
                emotions: video.emotions,
                shotTypes: video.shotTypes,
              }}
              aspectRatio={video.aspectRatio}
              scenes={video.scenes}
              initialStartTime={video.scenes.filter(scene => scene.matched)[0]?.startTime}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="text-center py-16">
      <div className="size-24 mx-auto mb-6 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center">
        <MagnifyingGlassIcon className="size-10 text-black/20 dark:text-white/20" />
      </div>
      <p className="text-black/40 dark:text-white/40 text-base">Start typing to search your video scenes</p>
    </div>
  )
}
