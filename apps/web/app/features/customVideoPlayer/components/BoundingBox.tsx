import type { BoundingBoxProps } from '../types';
import { OVERLAY_COLORS } from '../constants/styles'
import { formatConfidence } from '../utils/formatting'

export function BoundingBox({ bbox, label, type, confidence, videoElement, videoDimensions }: BoundingBoxProps) {
  if (!bbox || !videoElement?.videoWidth) return null

  const scaleX = videoDimensions.width / videoElement.videoWidth
  const scaleY = videoDimensions.height / videoElement.videoHeight

  const style = {
    position: 'absolute' as const,
    left: bbox.x * scaleX,
    top: bbox.y * scaleY,
    width: bbox.width * scaleX,
    height: bbox.height * scaleY,
  }

  return (
    <div className={`border-[3px] rounded-xl ${OVERLAY_COLORS[type]}`} style={style}>
      <div className="absolute -top-9 left-0 px-3 py-1.5 rounded-lg bg-black/90 flex items-center gap-2">
        <span className="text-xs text-white font-semibold">{label}</span>
        {confidence && <span className="text-xs text-white/70">{formatConfidence(confidence)}</span>}
      </div>
    </div>
  )
}
