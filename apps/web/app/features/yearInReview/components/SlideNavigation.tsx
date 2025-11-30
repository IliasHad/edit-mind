import { motion } from 'framer-motion'

interface Props {
  currentSlide: number
  totalSlides: number
  onNavigate: (index: number) => void
  onNext: () => void
  onPrev: () => void
}

export function SlideNavigation({ currentSlide, totalSlides, onNavigate, onNext, onPrev }: Props) {
  return (
    <>
      <div className="fixed right-8 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3">
        {Array.from({ length: totalSlides }).map((_, index) => (
          <motion.button
            key={index}
            className={`h-2 rounded-full transition-all ${
              index === currentSlide ? 'w-2 bg-white' : 'w-2 bg-white/30 hover:bg-white/50'
            }`}
            onClick={() => onNavigate(index)}
            whileHover={{ scale: 1.3 }}
            whileTap={{ scale: 0.9 }}
          />
        ))}
      </div>

      {currentSlide > 0 && (
        <motion.button
          className="fixed left-8 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/15 hover:text-white transition-all"
          onClick={onPrev}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </motion.button>
      )}

      {currentSlide < totalSlides - 1 && (
        <motion.button
          className="fixed right-24 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/15 hover:text-white transition-all"
          onClick={onNext}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </motion.button>
      )}

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-white/10 backdrop-blur-md rounded-full px-5 py-2 border border-white/10">
        <span className="text-white/60 text-sm font-medium tabular-nums">
          {currentSlide + 1} / {totalSlides}
        </span>
      </div>
    </>
  )
}