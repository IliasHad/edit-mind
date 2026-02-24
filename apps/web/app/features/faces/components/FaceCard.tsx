import { CheckIcon, XMarkIcon } from '@heroicons/react/24/solid'
import { ClockIcon, FilmIcon, EyeIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'
import { motion } from 'framer-motion'
import type { UnknownFace } from '@shared/types/unknownFace'
import { Button } from '@ui/components/Button'

interface FaceCardProps {
    face: UnknownFace
    isSelected: boolean
    onSelect: () => void
    onDelete: () => void
}

export const FaceCard = ({ face, isSelected, onSelect, onDelete }: FaceCardProps) => {
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
          ${isSelected
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
                            className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'
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

                    <Button
                        leftIcon={<XMarkIcon className="w-4 h-4 text-white hover:text-inherit" />}
                        onClick={(e) => {
                            e.stopPropagation()
                            onDelete()
                        }}
                        className="absolute top-3 left-3 w-7 h-7 bg-black/60 dark:bg-white/10 backdrop-blur-sm rounded-full"
                        title="Delete face"
                    />


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
        </div >
    )
}
