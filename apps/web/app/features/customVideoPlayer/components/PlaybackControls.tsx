import { Button } from '@ui/components/Button'
import type { PlaybackControlsProps } from '../types'
import { useTranslation } from 'react-i18next'

export function PlaybackControls({ isPlaying, onTogglePlay }: PlaybackControlsProps) {
  const { t } = useTranslation()

  return (
    <Button
      variant="outline"
      onClick={onTogglePlay}
      className="w-11 h-11 flex items-center justify-center rounded-full bg-white hover:bg-white/90 transition-all active:scale-95 shadow-lg"
      aria-label={isPlaying ? t('player.controls.pause') : t('player.controls.play')}
      leftIcon={
        isPlaying ? (
          <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )
      }
    ></Button>
  )
}
