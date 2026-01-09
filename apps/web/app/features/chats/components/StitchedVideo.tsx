import { ArrowDownTrayIcon, FilmIcon } from '@heroicons/react/24/solid'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'

interface StitchedVideoProps {
  stitchedVideoPath: string
}

export function StitchedVideo({ stitchedVideoPath }: StitchedVideoProps) {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)

  return (
    <AnimatePresence>
      <motion.div
        key={stitchedVideoPath}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-3xl"
      >
        <div className="rounded-2xl overflow-hidden bg-black shadow-2xl border border-black/10 dark:border-white/10">
          <div className="px-5 py-3 bg-linear-to-b from-black/5 to-black/2 dark:from-white/5 dark:to-white/2 border-b border-black/10 dark:border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FilmIcon className="w-4 h-4 text-black/70 dark:text-white/70" />
                <span className="text-sm font-medium text-black/70 dark:text-white/70">Compiled Video</span>
              </div>

              <a
                href={'/media?source=' + encodeURIComponent(stitchedVideoPath)}
                download
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-black/70 dark:text-white/70 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                Download
              </a>
            </div>
          </div>

          <div className="relative bg-black aspect-video">
            <video
              src={'/media?source=' + encodeURIComponent(stitchedVideoPath)}
              controls
              className="w-full h-full"
              onPlay={() => setIsVideoPlaying(true)}
              onPause={() => setIsVideoPlaying(false)}
            />

            {!isVideoPlaying && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] pointer-events-none"
              >
                <div className="w-16 h-16 rounded-full bg-white/90 dark:bg-white/80 flex items-center justify-center shadow-xl">
                  <svg className="w-7 h-7 ml-1" fill="black" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
