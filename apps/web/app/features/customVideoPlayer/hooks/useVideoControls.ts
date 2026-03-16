import { useState, useCallback, type RefObject } from 'react'

export function useVideoControls(videoRef: RefObject<HTMLVideoElement | null>) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [loading, setLoading] = useState(false)

  const togglePlay = useCallback(() => {
    if (!videoRef) return null
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      setLoading(true)
      video.play()
      setIsPlaying(true)
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }, [videoRef])

  const toggleMute = useCallback(() => {
    if (!videoRef) return null

    const video = videoRef.current
    if (!video) return

    video.muted = !video.muted
    setIsMuted(!isMuted)
  }, [videoRef, isMuted])

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!videoRef) return null
      const video = videoRef.current
      if (!video) return

      const newVolume = parseFloat(e.target.value)
      video.volume = newVolume
      setVolume(newVolume)

      if (newVolume === 0) {
        setIsMuted(true)
        video.muted = true
      } else if (isMuted) {
        setIsMuted(false)
        video.muted = false
      }
    },
    [videoRef, isMuted]
  )

  const toggleFullscreen = useCallback((containerRef: RefObject<HTMLDivElement | null>) => {
    if (!containerRef.current) return

    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      containerRef.current.requestFullscreen()
    }
  }, [])

  return {
    isPlaying,
    setIsPlaying,
    volume,
    isMuted,
    togglePlay,
    toggleMute,
    handleVolumeChange,
    toggleFullscreen,
    setLoading,
    loading
  }
}
