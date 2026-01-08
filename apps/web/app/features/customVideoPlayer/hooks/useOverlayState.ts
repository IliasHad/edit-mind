import { useState } from 'react'
import type { OverlayMode } from '../types'

export function useOverlayState() {
  const [overlayMode, setOverlayMode] = useState<OverlayMode>('faces')
  const [showOverlays, setShowOverlays] = useState(true)

  return {
    overlayMode,
    setOverlayMode,
    showOverlays,
    setShowOverlays,
  }
}
