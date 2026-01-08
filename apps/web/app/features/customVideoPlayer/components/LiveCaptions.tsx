import { motion } from 'framer-motion'

interface LiveCaptionsProps {
  transcription: string
}

export function LiveCaptions({ transcription }: LiveCaptionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="absolute bottom-0 left-1/2 -translate-x-1/2 px-4 w-full max-w-3xl pointer-events-none"
    >
      <div className="bg-black/60 px-4 py-2 rounded-md">
        <p className="text-white text-center text-lg leading-snug">{transcription}</p>
      </div>
    </motion.div>
  )
}
