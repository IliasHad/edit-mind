import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

interface Props {
  title: string
  content: string
  year: number
  onContinue: () => void
}

export function Hero({ content, year, onContinue }: Props) {
  const [counters, setCounters] = useState({
    videos: 0,
    scenes: 0,
    faces: 0,
  })

  useEffect(() => {
    const parseStats = () => {
      const videoMatch = content.match(/(\d+)\s*(videos?|clips?)/i)
      const sceneMatch = content.match(/(\d+)\s*scenes?/i)
      const faceMatch = content.match(/(\d+)\s*faces?/i)

      return {
        videos: videoMatch ? parseInt(videoMatch[1]) : 0,
        scenes: sceneMatch ? parseInt(sceneMatch[1]) : 0,
        faces: faceMatch ? parseInt(faceMatch[1]) : 0,
      }
    }

    const targets = parseStats()

    const duration = 2000
    const steps = 60
    const interval = duration / steps

    let step = 0
    const timer = setInterval(() => {
      step++
      const progress = step / steps

      setCounters({
        videos: Math.floor(targets.videos * progress),
        scenes: Math.floor(targets.scenes * progress),
        faces: Math.floor(targets.faces * progress),
      })

      if (step >= steps) {
        clearInterval(timer)
        setCounters(targets)
      }
    }, interval)

    return () => clearInterval(timer)
  }, [content])

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      <motion.div
        className="absolute inset-0 bg-linear-to-br from-purple-950/30 via-black to-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
      />

      <motion.div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <div className="relative z-10 flex flex-col items-center justify-center h-full px-8 text-center">
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="text-[140px] md:text-[200px] font-bold tracking-tight text-white leading-none">{year}</h1>
        </motion.div>

        <motion.h2
          className="text-3xl md:text-5xl font-semibold text-white/90 mb-20 max-w-2xl tracking-tight"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          Your Year in Review
        </motion.h2>

        <motion.div
          className="flex items-center gap-12 md:gap-16 mb-20"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          {counters.videos > 0 && <StatCard value={counters.videos} label="Videos" />}
          {counters.scenes > 0 && (
            <>
              <div className="w-px h-12 bg-white/10" />
              <StatCard value={counters.scenes} label="Scenes" />
            </>
          )}
          {counters.faces > 0 && (
            <>
              <div className="w-px h-12 bg-white/10" />
              <StatCard value={counters.faces} label="Faces" />
            </>
          )}
        </motion.div>

        <motion.button
          className="group relative px-10 py-4 bg-white text-black rounded-full font-medium text-base tracking-tight overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.6 }}
          onClick={onContinue}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="relative z-10 flex items-center gap-2">
            Continue
            <motion.span initial={{ x: 0 }} whileHover={{ x: 4 }} transition={{ duration: 0.2 }}>
              →
            </motion.span>
          </span>

          <motion.div
            className="absolute inset-0 bg-white/90"
            initial={{ scale: 0 }}
            whileHover={{ scale: 1 }}
            transition={{ duration: 0.3 }}
          />
        </motion.button>

        <motion.div
          className="absolute bottom-12 flex flex-col items-center text-white/40 text-sm font-light"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
        >
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7" />
            </svg>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <motion.div
        className="text-6xl md:text-7xl font-bold text-white mb-2 tabular-nums"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {value.toLocaleString()}
      </motion.div>

      <div className="text-sm md:text-base text-white/50 font-medium tracking-wide uppercase">{label}</div>
    </div>
  )
}
