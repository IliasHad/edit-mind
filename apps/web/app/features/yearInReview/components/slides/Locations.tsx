import { motion } from 'framer-motion'
import { MapPin } from 'lucide-react'

interface LocationData {
  name: string
  count: number
}

interface Props {
  title: string
  content: string
  locations: LocationData[]
}

export function Locations({ title, content, locations }: Props) {
  const maxCount = Math.max(...locations.map((l) => l.count), 1)

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <div className="absolute inset-0 bg-linear-to-br from-purple-950/15 via-black to-black" />

      <motion.div
        className="absolute top-1/3 left-1/4 w-[700px] h-[700px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.2, 0.3, 0.2],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <div className="relative z-10 flex flex-col items-center justify-center h-full px-8 py-12">
        <motion.h2
          className="text-4xl md:text-5xl font-semibold text-white mb-8 tracking-tight text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          {title}
        </motion.h2>

        <motion.p
          className="text-lg text-white/70 mb-12 max-w-2xl text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          {content}
        </motion.p>

        <div className="w-full max-w-3xl space-y-4">
          {locations.map((location, index) => {
            const percentage = (location.count / maxCount) * 100
            const isTop = index === 0

            return (
              <motion.div
                key={location.name}
                className={`relative overflow-hidden rounded-2xl border ${
                  isTop ? 'bg-purple-950/20 border-purple-500/30' : 'bg-white/5 border-white/10'
                }`}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: 0.3 + index * 0.1,
                  duration: 0.6,
                  ease: [0.16, 1, 0.3, 1],
                }}
                whileHover={{
                  scale: 1.02,
                  backgroundColor: isTop ? 'rgba(88, 28, 135, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                  transition: { duration: 0.2 },
                }}
              >
                <motion.div
                  className={`absolute inset-0 ${isTop ? 'bg-purple-500/15' : 'bg-white/5'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{
                    delay: 0.5 + index * 0.1,
                    duration: 1,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                />

                <div className="relative z-10 flex items-center gap-4 py-5 px-6">
                  <motion.div
                    className={`flex items-center justify-center w-10 h-10 rounded-full ${
                      isTop ? 'bg-purple-500/20 text-purple-300' : 'bg-white/10 text-white/70'
                    }`}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      delay: 0.6 + index * 0.1,
                      duration: 0.5,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    <MapPin className="w-5 h-5" />
                  </motion.div>

                  <div className="flex-1 min-w-0">
                    <motion.h3
                      className={`text-lg font-medium truncate ${isTop ? 'text-white' : 'text-white/90'}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.7 + index * 0.1, duration: 0.4 }}
                    >
                      {location.name}
                    </motion.h3>
                    <motion.p
                      className="text-sm text-white/50"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.8 + index * 0.1, duration: 0.4 }}
                    >
                      {location.count} {location.count === 1 ? 'video' : 'videos'}
                    </motion.p>
                  </div>

                  <motion.div
                    className="flex flex-col items-end"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: 0.7 + index * 0.1,
                      duration: 0.4,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    <span className={`text-3xl font-bold tabular-nums ${isTop ? 'text-purple-300' : 'text-white'}`}>
                      {location.count}
                    </span>
                    {isTop && (
                      <motion.span
                        className="text-xs font-medium text-purple-400 uppercase tracking-wider"
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.9, duration: 0.3 }}
                      >
                        Top Spot
                      </motion.span>
                    )}
                  </motion.div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {locations.length > 0 && (
          <motion.div
            className="mt-12 flex gap-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 + locations.length * 0.1, duration: 0.6 }}
          >
            <div>
              <div className="text-3xl font-bold text-white tabular-nums">{locations.length}</div>
              <div className="text-sm text-white/50 mt-1">{locations.length === 1 ? 'Location' : 'Locations'}</div>
            </div>
            <div className="w-px bg-white/10" />
            <div>
              <div className="text-3xl font-bold text-white tabular-nums">
                {locations.reduce((sum, l) => sum + l.count, 0)}
              </div>
              <div className="text-sm text-white/50 mt-1">Total Videos</div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
