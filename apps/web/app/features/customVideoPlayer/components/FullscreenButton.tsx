import { ArrowsPointingOutIcon } from '@heroicons/react/24/solid'
import { useEffect } from 'react'

interface FullscreenButtonProps {
  onToggleFullscreen: () => void
}

export function FullscreenButton({ onToggleFullscreen }: FullscreenButtonProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'f') {
        onToggleFullscreen()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onToggleFullscreen])

  return (
    <button
      onClick={onToggleFullscreen}
      className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
      aria-label="Toggle fullscreen"
    >
      <ArrowsPointingOutIcon className="text-white h-5" strokeWidth={2} />
    </button>
  )
}
