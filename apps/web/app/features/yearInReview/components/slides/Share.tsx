import { motion } from 'framer-motion'
import { useState } from 'react'
import { Download } from 'lucide-react'

interface Props {
  title: string
  content: string
  year: number
  videoPath: string
}

export function Share({ title, content, year, videoPath }: Props) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    try {
      setDownloading(true)

      const response = await fetch(`/media${videoPath}`)
      if (!response.ok) throw new Error('Download failed')

      const blob = await response.blob()

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `year-in-review-${year}.mp4`
      document.body.appendChild(a)
      a.click()

      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Download failed:', err)
    } finally {
      setDownloading(false)
    }
  }

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
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <div className="relative z-10 flex flex-col items-center justify-center h-full px-8">
        <motion.div
          className="text-center max-w-2xl"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="text-5xl md:text-6xl font-semibold text-white mb-6 tracking-tight">{title}</h2>

          <p className="text-xl text-white/70 mb-12 leading-relaxed tracking-tight">{content}</p>

          <div className="flex items-center justify-center gap-4">
            <motion.button
              className="group relative px-12 py-4 bg-white/10 text-white rounded-full font-medium text-base tracking-tight overflow-hidden backdrop-blur-sm border border-white/20"
              onClick={handleDownload}
              disabled={downloading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                <Download className={`w-4 h-4 ${downloading ? 'animate-bounce' : ''}`} />
                {downloading ? 'Downloading...' : 'Download Video'}
              </span>

              <motion.div
                className="absolute inset-0 bg-white/5"
                initial={{ scale: 0 }}
                whileHover={{ scale: 1 }}
                transition={{ duration: 0.3 }}
              />
            </motion.button>
          </div>

          <motion.p
            className="mt-10 text-white/40 text-sm tracking-wide"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
          >
            Thank you for {year}
          </motion.p>
        </motion.div>
      </div>
    </div>
  )
}
