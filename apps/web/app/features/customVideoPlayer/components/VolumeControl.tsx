import { SpeakerWaveIcon as Volume2, SpeakerXMarkIcon as VolumeX } from '@heroicons/react/24/outline'
import type { VolumeControlProps } from '../types'

export function VolumeControl({ volume, isMuted, onToggleMute, onVolumeChange }: VolumeControlProps) {
  return (
    <div className="flex items-center gap-2 group/volume">
      <button
        onClick={onToggleMute}
        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        aria-label={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted || volume === 0 ? (
          <VolumeX className="w-5 h-5 text-white" strokeWidth={2} />
        ) : (
          <Volume2 className="w-5 h-5 text-white" strokeWidth={2} />
        )}
      </button>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={volume}
        onChange={onVolumeChange}
        aria-label="Volume"
        className="w-0 group-hover/volume:w-24 transition-all duration-300 h-1 rounded-full appearance-none bg-white/20 outline-none 
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:shadow-lg"
      />
    </div>
  )
}
