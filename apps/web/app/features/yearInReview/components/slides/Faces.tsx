import type { YearInReviewFace } from '@shared/schemas/yearInReview'
import { motion } from 'framer-motion'

interface Props {
  title: string
  content: string
  faces: YearInReviewFace[]
}

export function Faces({ title, content, faces }: Props) {
  const getDelay = (itemIndex: number) => {
    return 0.3 + itemIndex * 0.05
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <div className="absolute inset-0 bg-linear-to-br from-cyan-950/15 via-black to-black" />
      <motion.div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(34, 211, 238, 0.06) 0%, transparent 70%)',
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

      <div className="relative z-10 flex flex-col items-center h-full px-6 py-12 md:py-16">
        <div className="text-center mb-8 shrink-0">
          <motion.h2
            className="text-4xl md:text-5xl font-semibold text-white mb-3 tracking-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            {title}
          </motion.h2>
          <motion.p
            className="text-white/60 text-lg max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            {content}
          </motion.p>
        </div>

        <div className="w-full max-w-5xl flex-1 overflow-y-auto pr-2 custom-scrollbar mask-fade-bottom">
          <div className="flex flex-col gap-10 pb-10">
            {faces.length > 0 && (
              <div>
                <motion.h3
                  className="text-cyan-400/80 text-sm font-medium uppercase tracking-widest mb-4 pl-1"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  Top People
                </motion.h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {faces.slice(0, 12).map((item, index) => (
                    <StatCard
                      key={`face-${item.name}`}
                      label={item.name}
                      count={item.count}
                      delay={getDelay(index)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.25);
        }
        /* Fade effect at bottom of scroll area */
        .mask-fade-bottom {
          mask-image: linear-gradient(to bottom, black 90%, transparent 100%);
        }
      `}</style>
    </div>
  )
}

function StatCard({ label, count, delay }: { label: string; count: number; delay: number }) {
  return (
    <motion.div
      className="relative bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-colors group"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: delay,
        duration: 0.4,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={{ scale: 1.02 }}
    >
      <div className="flex flex-col items-center text-center justify-between h-full">
        <h3 className="text-sm md:text-base font-medium text-white/80 group-hover:text-white transition-colors tracking-tight line-clamp-1">
          {label}
        </h3>

        <motion.span
          className="text-2xl md:text-3xl font-semibold text-white tabular-nums mt-2"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: delay + 0.2, duration: 0.3 }}
        >
          {count}
        </motion.span>
      </div>
    </motion.div>
  )
}
