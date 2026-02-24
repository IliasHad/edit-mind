import { CheckIcon } from '@heroicons/react/24/solid';
import { EyeIcon } from '@heroicons/react/24/outline';
import { Pagination } from './Pagination'
import { motion } from 'framer-motion'
import { useFaces } from '../hooks/useFaces'
import { FaceCard } from './FaceCard';

export const UnknownFacesGrid = () => {
  const {
    unknownFaces,
    selectedFaces,
    handleSelectFace,
    handleDeleteUnknownFace,
    unknownPagination,
    handleUnknownPageChange,
    loading,
  } = useFaces()

  return (
    <>
      <div className="flex flex-col h-full bg-white dark:bg-black">
        {!loading && unknownFaces.length > 0 && (
          <div className="px-6 py-4 border-b border-black/5 dark:border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-black/40 dark:bg-white/40" />
                  <span className="text-sm font-medium text-black/60 dark:text-white/60">
                    {unknownFaces.length} Unknown Faces
                  </span>
                </div>
                {selectedFaces.size > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-black/5 dark:bg-white/5 rounded-full"
                  >
                    <CheckIcon className="w-3.5 h-3.5 text-black dark:text-white" />
                    <span className="text-sm font-medium text-black dark:text-white">
                      {selectedFaces.size} Selected
                    </span>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-6">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-2 border-black/10 dark:border-white/10" />
                  <div className="absolute inset-0 rounded-full border-2 border-t-black dark:border-t-white border-r-black/60 dark:border-r-white/60 border-b-black/20 dark:border-b-white/20 border-l-transparent animate-spin" />
                </div>
                <div className="text-center">
                  <p className="text-base font-semibold text-black/90 dark:text-white/90">Loading faces</p>
                  <p className="text-sm text-black/40 dark:text-white/40 mt-1">Please wait...</p>
                </div>
              </div>
            </div>
          ) : unknownFaces.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-sm px-6">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center">
                  <EyeIcon className="w-10 h-10 text-black/20 dark:text-white/20" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold text-black/90 dark:text-white/90 mb-2">No Unknown Faces</h3>
                <p className="text-sm text-black/40 dark:text-white/40 leading-relaxed">
                  All faces have been identified or no faces have been detected yet.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6  gap-4">
                {unknownFaces.map((face) => (
                  <FaceCard
                    key={`${face.face_id}_${face.image_hash}`}
                    face={face}
                    isSelected={selectedFaces.has(face.image_hash)}
                    onSelect={() => handleSelectFace(face.image_hash)}
                    onDelete={() => handleDeleteUnknownFace(face)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {!loading && unknownFaces.length > 0 && (
          <div className="border-t border-black/5 dark:border-white/5 bg-white/80 dark:bg-black/40 backdrop-blur-xl">
            <Pagination
              currentPage={unknownPagination.page}
              totalPages={unknownPagination.totalPages}
              totalItems={unknownPagination.total}
              onPageChange={handleUnknownPageChange}
              itemsPerPage={40}
            />
          </div>
        )}
      </div>
    </>
  )
}
