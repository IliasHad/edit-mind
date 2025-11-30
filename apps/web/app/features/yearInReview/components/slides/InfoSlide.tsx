import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

interface Props {
  title: string
  content: string
  themeColor?: 'amber' | 'cyan' | 'purple' | 'pink'
}

const themeClasses = {
  amber: {
    gradient: 'from-amber-950/15',
    glow: 'rgba(251, 191, 36, 0.06)',
    bullet: 'bg-amber-400/60',
  },
  cyan: {
    gradient: 'from-cyan-950/15',
    glow: 'rgba(34, 211, 238, 0.06)',
    bullet: 'bg-cyan-400/60',
  },
  purple: {
    gradient: 'from-purple-950/15',
    glow: 'rgba(168, 85, 247, 0.06)',
    bullet: 'bg-purple-400/60',
  },
  pink: {
    gradient: 'from-pink-950/15',
    glow: 'rgba(236, 72, 153, 0.06)',
    bullet: 'bg-pink-400/60',
  },
}

export function InfoSlide({ title, content, themeColor = 'amber' }: Props) {
  const [items, setItems] = useState<string[]>([])
  const theme = themeClasses[themeColor]

  useEffect(() => {
    const parsed = content
      .split(/[•\n-]/)
      .map((f) => f.trim())
      .filter((f) => f.length > 20)
    setItems(parsed)
  }, [content])

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <div className={`absolute inset-0 bg-linear-to-br ${theme.gradient} via-black to-black`} />

      <motion.div
        className="absolute top-1/4 right-1/3 w-[700px] h-[700px] rounded-full"
        style={{
          background: `radial-gradient(circle, ${theme.glow} 0%, transparent 70%)`,
          filter: 'blur(80px)',
        }}
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.2, 0.3, 0.2],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <div className="relative z-10 flex flex-col items-center justify-center h-full px-8 py-16">
        <motion.h2
          className="text-4xl md:text-5xl font-semibold text-white mb-16 tracking-tight text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          {title}
        </motion.h2>

        <div className="w-full max-w-3xl space-y-5 max-h-[60vh] overflow-y-auto custom-scrollbar pr-4">
          {items.map((item, index) => (
            <motion.div
              key={index}
              className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: index * 0.08,
                duration: 0.6,
                ease: [0.16, 1, 0.3, 1],
              }}
              whileHover={{
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                scale: 1.01,
                transition: { duration: 0.3 },
              }}
            >
              <div className="flex items-start gap-4">
                <div className={`shrink-0 w-1.5 h-1.5 rounded-full ${theme.bullet} mt-2.5`} />
                <p className="text-lg font-medium text-white/90 leading-relaxed tracking-tight">{item}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
