import type { Scene, BoundingBox } from '@shared/types/scene'

export type OverlayType = 'face' | 'object' | 'text' | 'captions'
export type OverlayMode = 'all' | 'faces' | 'objects' | 'text' | 'none' | 'captions'

export interface VideoControlsState {
  isPlaying: boolean
  volume: number
  isMuted: boolean
  currentTime: number
  duration: number
}

export interface OverlayState {
  mode: OverlayMode
  visible: boolean
}

export interface VideoDimensions {
  width: number
  height: number
  offsetX: number
  offsetY: number
}

export interface BoundingBoxProps {
  bbox?: BoundingBox
  label: string
  type: OverlayType
  confidence?: number
  videoDimensions: VideoDimensions
  videoElement: HTMLVideoElement
}

export interface CustomVideoPlayerProps {
  source: string
  scenes?: Scene[]
  title?: string
  defaultStartTime?: number
  onTimeUpdate: (time: number) => void
}

export interface PlaybackControlsProps {
  isPlaying: boolean
  onTogglePlay: () => void
}

export interface VolumeControlProps {
  volume: number
  isMuted: boolean
  onToggleMute: () => void
  onVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export interface ProgressBarProps {
  scenes: Scene[]
  duration: number
  currentTime: number
  onSeek: (time: number) => void
}

export interface OverlayManagerProps {
  currentScene: Scene | null
  overlayMode: OverlayMode
  showOverlays: boolean
  videoDimensions: VideoDimensions
  videoRef: React.RefObject<HTMLVideoElement | null>
}

export interface Bucket {
  end: number
  start: number
  scenes: Scene[]
}
