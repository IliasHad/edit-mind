import { motion } from 'framer-motion'

export function Sidebar() {
  return (
    <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">

      <motion.div
        className="absolute top-0 left-10 right-10 h-px bg-linear-to-r from-transparent via-white/20 to-transparent"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 flex flex-col justify-center align-bottom pl-12 text-white h-full">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="space-y-10"
        >
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-linear-to-r from-white/20 to-transparent" />
          </div>

          <div className="space-y-5">

            <h2 className="text-[2.6rem] font-semibold leading-[1.15] tracking-tight text-white/90">
              Organize your
              <br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-white via-white/90 to-white/50">
                video library
              </span>
              <br />
              with AI
            </h2>

            <p className="text-md text-white/40 max-w-xs leading-relaxed font-light">
              Deep indexing, natural language search, and automatic rough cuts — all processed locally on your machine.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}