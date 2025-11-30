import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import type { TopScene } from '@shared/schemas/yearInReview'
import { humanizeSeconds } from '~/features/shared/utils/duration'

interface Props {
  title: string
  content: string
  scenes?: TopScene[]
}

export function Scenes({ title, scenes = [] }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % scenes.length)
  }

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + scenes.length) % scenes.length)
  }

  if (scenes.length === 0) {
    return (
      <div className="relative w-full h-full bg-black overflow-hidden">
        <div className="flex items-center justify-center h-full">
          <p className="text-white/50 text-lg">No scenes to display</p>
        </div>
      </div>
    )
  }

  const currentScene = scenes[currentIndex]

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <div className="absolute inset-0 bg-linear-to-br from-purple-950/20 via-black to-black" />

      <motion.div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.3, 0.4, 0.3],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <div className="relative z-10 flex flex-col items-center justify-center h-full px-8 py-20">
        <motion.h2
          className="text-4xl md:text-5xl font-semibold text-white mb-16 tracking-tight"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          {title}
        </motion.h2>

        <div className="relative w-full max-w-4xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="relative rounded-3xl overflow-hidden bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="relative aspect-video overflow-hidden">
                  <img
                    src={`/thumbnails/${currentScene.thumbnailUrl}`}
                    alt={`Scene ${currentIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent" />

                  <div className="absolute top-6 right-6 bg-black/60 backdrop-blur-md rounded-full px-4 py-2">
                    <span className="text-white/90 text-sm font-medium tabular-nums">
                      {humanizeSeconds(currentScene.duration)}
                    </span>
                  </div>

                  <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <motion.div
                      className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20"
                      whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.25)' }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-10 border-l-white border-b-[6px] border-b-transparent ml-1" />
                    </motion.div>
                  </motion.div>
                </div>

                <div className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-white/40 text-sm font-medium tracking-wide">
                      {currentIndex + 1} / {scenes.length}
                    </span>
                  </div>

                  {currentScene.description && (
                    <p className="text-white/70 text-sm mb-5 leading-relaxed">{currentScene.description}</p>
                  )}

                  <div className="space-y-5">
                    {currentScene.objects.length > 0 && (
                      <div>
                        <div className="text-white/50 text-xs font-medium tracking-wider uppercase mb-3">Detected</div>
                        <div className="flex flex-wrap gap-2">
                          {currentScene.objects.map((obj, idx) => (
                            <motion.span
                              key={idx}
                              className="px-3 py-1.5 bg-white/10 text-white/80 rounded-full text-sm font-medium"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: idx * 0.05, duration: 0.3 }}
                            >
                              {obj}
                            </motion.span>
                          ))}
                        </div>
                      </div>
                    )}

                    {currentScene.faces.length > 0 && (
                      <div>
                        <div className="text-white/50 text-xs font-medium tracking-wider uppercase mb-3">People</div>
                        <div className="flex flex-wrap gap-2">
                          {currentScene.faces.map((face, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1.5 bg-white/10 text-white/80 rounded-full text-sm font-medium"
                            >
                              {face}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {currentScene.emotions.length > 0 && (
                      <div>
                        <div className="text-white/50 text-xs font-medium tracking-wider uppercase mb-3">Emotions</div>
                        <div className="flex flex-wrap gap-2">
                          {currentScene.emotions.map((emotion, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1.5 bg-purple-500/20 text-purple-200/90 rounded-full text-sm font-medium border border-purple-500/20"
                            >
                              {emotion}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <motion.button
            onClick={handlePrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-20 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/15 hover:text-white transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </motion.button>

          <motion.button
            onClick={handleNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-20 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/15 hover:text-white transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </motion.button>

          <motion.div
            className="flex justify-center gap-2 mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            {scenes.map((_, idx) => (
              <motion.button
                key={idx}
                className={`h-1 rounded-full transition-all ${
                  idx === currentIndex ? 'w-8 bg-white' : 'w-1 bg-white/30 hover:bg-white/50'
                }`}
                onClick={() => setCurrentIndex(idx)}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
              />
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
