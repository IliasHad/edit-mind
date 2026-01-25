import { CheckIcon, XMarkIcon } from '@heroicons/react/24/solid'
import { ClockIcon, FilmIcon, EyeIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { Pagination } from './Pagination'
import { useState } from 'react'
import { motion } from 'framer-motion'
import type { UnknownFace } from '@shared/types/unknownFace'
import { useFaces } from '../hooks/useFaces'

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

interface FaceCardProps {
  face: UnknownFace
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
}

const FaceCard = ({ face, isSelected, onSelect, onDelete }: FaceCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div className="group relative" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <div
        className={`
          relative aspect-3/4 rounded-lg overflow-hidden cursor-pointer
          bg-zinc-100 dark:bg-zinc-900
          ring-1 ring-black/5 dark:ring-white/10
          transition-all duration-300 ease-out
          ${
            isSelected
              ? 'ring-2 ring-black dark:ring-white scale-[0.97] shadow-2xl shadow-black/10 dark:shadow-black/30'
              : 'hover:ring-black/10 dark:hover:ring-white/20 hover:shadow-2xl hover:shadow-black/10 dark:hover:shadow-black/30'
          }
        `}
        style={{
          transform: isHovered && !isSelected ? 'translateY(-4px)' : 'translateY(0)',
        }}
        onClick={onSelect}
      >
        <div className="relative w-full h-full">
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-black/10 dark:border-white/10 border-t-black/40 dark:border-t-white/40 animate-spin" />
            </div>
          )}

          {imageError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-800">
              <PhotoIcon className="w-12 h-12 text-zinc-400 dark:text-zinc-600 mb-2" />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Preview unavailable</p>
            </div>
          ) : (
            <img
              src={`/unknown_faces/${face.image_file}`}
              alt={`Unknown face ${face.face_id}`}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-transparent pointer-events-none"
          />

          {isSelected && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="absolute top-3 right-3 w-7 h-7 bg-white dark:bg-black rounded-full flex items-center justify-center shadow-lg shadow-black/50 ring-1 ring-black/10 dark:ring-white/10"
            >
              <CheckIcon className="w-4 h-4 text-black dark:text-white" />
            </motion.div>
          )}

          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: isHovered ? 1 : 0,
              scale: isHovered ? 1 : 0.8,
            }}
            transition={{ duration: 0.2 }}
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="absolute top-3 left-3 w-7 h-7 bg-black/60 dark:bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center transition-all duration-200 hover:bg-red-500 hover:scale-110 active:scale-95"
            title="Delete face"
          >
            <XMarkIcon className="w-4 h-4 text-white" />
          </motion.button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: isHovered ? 1 : 0,
              y: isHovered ? 0 : 20,
            }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-0 left-0 right-0 p-4 text-white"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <FilmIcon className="w-3 h-3 text-white/60 shrink-0" strokeWidth={2} />
                <p className="text-xs font-semibold text-white truncate">{face.video_name}</p>
              </div>

              <div className="flex items-center gap-2">
                <ClockIcon className="w-3 h-3 text-white/60 shrink-0" strokeWidth={2} />
                <p className="text-xs text-white/80">
                  {face.all_appearances[0]?.formatted_timestamp || 'Unknown time'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <EyeIcon className="w-3 h-3 text-white/60 shrink-0" strokeWidth={2} />
                <p className="text-xs text-white/80">
                  {face.total_appearances} appearance{face.total_appearances !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: isHovered ? 0 : 1 }}
            className="absolute bottom-3 right-3 px-2 py-1 bg-black/70 backdrop-blur-sm rounded text-white text-xs font-medium"
          >
            {face.total_appearances}×
          </motion.div>
        </div>
      </div>
    </div>
  )
}
