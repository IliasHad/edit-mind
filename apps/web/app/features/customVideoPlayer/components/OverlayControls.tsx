import { motion, AnimatePresence } from 'framer-motion'
import { EyeIcon as Eye, EyeSlashIcon as EyeOff } from '@heroicons/react/24/outline'
import type { OverlayMode } from '../types'
import { OVERLAY_MODE_COLORS } from '../constants/styles'
import { useEffect } from 'react'
import { Button } from '@ui/components/Button'

interface OverlayControlsProps {
  showOverlays: boolean
  overlayMode: OverlayMode
  showControls: boolean
  onToggleOverlays: () => void
  onChangeMode: (mode: OverlayMode) => void
}

const OVERLAY_MODES: OverlayMode[] = ['all', 'faces', 'objects', 'text']

export function OverlayControls({
  showOverlays,
  overlayMode,
  showControls,
  onToggleOverlays,
  onChangeMode,
}: OverlayControlsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'v') {
        onToggleOverlays()
      }
         if (e.key.toLowerCase() === 'a') {
        onChangeMode("all")
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onChangeMode, onToggleOverlays])

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: showControls ? 1 : 0, x: showControls ? 0 : 20 }}
      className="absolute top-24 right-6 flex flex-col gap-2"
    >
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onToggleOverlays}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl backdrop-blur-xl border-2 shadow-xl transition-all ${
          showOverlays ? 'bg-white text-black border-white' : 'bg-black/60 text-white border-white/20'
        }`}
      >
        {showOverlays ? (
          <Eye className="w-4 h-4" strokeWidth={2.5} />
        ) : (
          <EyeOff className="w-4 h-4" strokeWidth={2.5} />
        )}
        <span className="text-xs font-bold uppercase tracking-wide">{showOverlays ? 'Hide' : 'Show'} AI</span>
      </motion.button>

      {showOverlays && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col gap-1.5 bg-black/80 backdrop-blur-xl rounded-xl border-2 border-white/20 p-2 shadow-xl"
          >
            {OVERLAY_MODES.map((mode) => (
              <Button
                variant="outline"
                key={mode}
                onClick={() => onChangeMode(mode)}
                className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                  overlayMode === mode ? OVERLAY_MODE_COLORS[mode] : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {mode}
              </Button>
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  )
}
