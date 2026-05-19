import { SpeakerWaveIcon, SpeakerXMarkIcon } from '@heroicons/react/24/outline'
import type { VolumeControlProps } from '../types'
import { Button } from '@ui/components/Button'
import { useTranslation } from 'react-i18next'

export function VolumeControl({ volume, isMuted, onToggleMute, onVolumeChange }: VolumeControlProps) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-2 group/volume">
      <Button
        variant='ghost'
        onClick={onToggleMute}
        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        aria-label={isMuted ? t('player.controls.unmute') : t('player.controls.mute')}
        leftIcon={
          isMuted || volume === 0 ? (
            <SpeakerXMarkIcon className="w-5 h-5 text-white" strokeWidth={2} />
          ) : (
            <SpeakerWaveIcon className="w-5 h-5 text-white" strokeWidth={2} />
          )
        }
      ></Button>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={volume}
        onChange={onVolumeChange}
        aria-label={t('player.controls.volume')}
        className="w-0 ml-2 group-hover/volume:w-24 transition-all duration-300 h-1 rounded-full appearance-none bg-white/20 outline-none 
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:shadow-lg"
      />
    </div>
  )
}
