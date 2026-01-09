import React from 'react'
import { Pagination } from './Pagination'
import { FaceSmileIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { useFaces } from '../hooks/useFaces'

export const KnownFacesGrid: React.FC = () => {
  const { knownFaces, loading, knownPagination, handleKnownPageChange } = useFaces()

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto">
          <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-2xl border-b border-white/10 px-6 py-6 pt-2">
            <div className="max-w-7xl mx-auto">
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-base text-white/60">
                {loading
                  ? 'Loading...'
                  : `${knownPagination.total} ${knownPagination.total === 1 ? 'person' : 'people'}`}
              </motion.p>
            </div>
          </div>

          <div className="px-6 py-8">
            <div className="max-w-7xl mx-auto">
              {loading ? (
                <div className="flex items-center justify-center py-32">
                  <div className="flex flex-col items-center gap-4">
                    <motion.div
                      className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    <p className="text-sm text-white/60">Loading people...</p>
                  </div>
                </div>
              ) : knownFaces.length === 0 ? (
                <div className="flex items-center justify-center py-32">
                  <div className="text-center max-w-sm">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
                      <FaceSmileIcon className="w-12 h-12 text-white/30" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-3">No People</h3>
                    <p className="text-sm text-white/50 leading-relaxed">
                      People you name will appear here. Start labeling faces to organize your photos by who's in them.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-12">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-6">
                      {knownFaces
                        .filter((face) => face.images.length > 0)
                        .map((face, index) => (
                          <motion.div
                            key={face.name}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{
                              duration: 0.3,
                              delay: index * 0.03,
                              ease: [0.16, 1, 0.3, 1],
                            }}
                          >
                            <Link to={`/app/faces/${face.name}`} className="group block">
                              <div className="relative aspect-square mb-3">
                                <motion.div
                                  className="relative w-full h-full rounded-full overflow-hidden bg-white/5 ring-1 ring-white/10"
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                >
                                  <img
                                    src={`/faces/${face.images[0]}`}
                                    alt={face.name}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />

                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
                                </motion.div>
                              </div>

                              <div className="text-center px-2">
                                <p className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors duration-200 truncate">
                                  {face.name}
                                </p>

                                <p className="text-xs text-white/50 mt-1">{face.images.length} Images</p>
                              </div>
                            </Link>
                          </motion.div>
                        ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {!loading && knownFaces.length > 0 && (
          <div className="sticky bottom-0 border-t border-white/10 bg-black/80 backdrop-blur-2xl">
            <Pagination
              currentPage={knownPagination.page}
              totalPages={knownPagination.totalPages}
              totalItems={knownPagination.total}
              onPageChange={handleKnownPageChange}
              itemsPerPage={40}
            />
          </div>
        )}
      </div>
    </>
  )
}
