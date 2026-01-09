import { useState } from 'react'
import { motion } from 'framer-motion'

interface KnownFaceCardProps {
  face: { name: string; image: string }
}

export const KnownFaceCard = ({ face }: KnownFaceCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const onHover = () => setIsHovered(true)
  const onLeave = () => setIsHovered(false)

  return (
    <div className="relative w-full h-auto overflow-hidden" onMouseEnter={onHover} onMouseLeave={onLeave}>
      <div className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:shadow-2xl hover:shadow-black/10 dark:hover:shadow-black/30 transition-all duration-300 ease-out">
        <div className="relative w-full h-full">
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-black/10 dark:border-white/10 border-t-black/40 dark:border-t-white/40 animate-spin" />
            </div>
          )}

          <img
            src={`/faces/${face.name}/${face.image}`}
            alt={face.name}
            className={`w-full h-full rounded-full object-cover transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
          />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-transparent pointer-events-none"
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: isHovered ? 1 : 0,
              y: isHovered ? 0 : 20,
            }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-0 left-0  text-center right-0 p-4 text-white"
          >
            <p className="text-sm font-semibold truncate mb-3">{face.name}</p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
