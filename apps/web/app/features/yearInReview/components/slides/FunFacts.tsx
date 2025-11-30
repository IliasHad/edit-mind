import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

interface Props {
  title: string
  content: string
}

export function FunFacts({ title, content }: Props) {
  const [facts, setFacts] = useState<string[]>([])

  useEffect(() => {
    const parsed = content
      .split(/[•\n]/)
      .map((f) => f.trim())
      .filter((f) => f.length > 0)
    setFacts(parsed)
  }, [content])

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <div className="absolute inset-0 bg-linear-to-br from-amber-950/15 via-black to-black" />

      <motion.div
        className="absolute top-1/4 right-1/3 w-[700px] h-[700px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(251, 191, 36, 0.06) 0%, transparent 70%)',
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
          className="text-4xl md:text-5xl font-semibold text-white mb-16 tracking-tight"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          {title}
        </motion.h2>

        <div className="w-full max-w-3xl space-y-5 max-h-[60vh] overflow-y-auto custom-scrollbar pr-4">
          {facts.map((fact, index) => (
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
                <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400/60 mt-2.5" />
                <p className="text-lg font-medium text-white/90 leading-relaxed tracking-tight">{fact}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
