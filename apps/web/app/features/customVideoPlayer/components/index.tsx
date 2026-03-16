import { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useVideoDimensions, type ObjectFit } from '../hooks/useVideoDimensions'
import type { CustomVideoPlayerProps, TranscodeStatus } from '../types'

import { useVideoControls } from '../hooks/useVideoControls'
import { useVideoProgress } from '../hooks/useVideoProgress'
import { useOverlayState } from '../hooks/useOverlayState'
import { useAutoHideControls } from '../hooks/useAutoHideControls'

import { OverlayManager } from './OverlayManager'
import { AIVisionBadge } from './AIVisionBadge'
import { OverlayControls } from './OverlayControls'
import { PlaybackControls } from './PlaybackControls'
import { VolumeControl } from './VolumeControl'
import { FullscreenButton } from './FullscreenButton'
import { ProgressBar } from './ProgressBar'
import { LiveCaptions } from './LiveCaptions'
import { CaptionsButton } from './CaptionsButton'
import { FitButton } from './FitButton'
import { TranscodingOverlay } from './TranscodingOverlay'
import { LoadingOverlay } from './LoadingOverlay'

interface ExtendedCustomVideoPlayerProps extends CustomVideoPlayerProps {
  objectFit?: ObjectFit
}

export function CustomVideoPlayer({
  source,
  scenes = [],
  title,
  defaultStartTime,
  onTimeUpdate,
  objectFit = 'contain',
}: ExtendedCustomVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const seekDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTranscoding = useRef(false)
  const [seekOffset, setSeekOffset] = useState(0)

  const [currentObjectFit, setCurrentObjectFit] = useState<ObjectFit>(objectFit)
  const [transcodedSrc, setTranscodedSrc] = useState<string | null>(null)
  const [transcodeStatus, setTranscodeStatus] = useState<TranscodeStatus>('direct')

  const activeSrc = transcodedSrc ?? `/media?source=${encodeURIComponent(source)}`

  const { videoDimensions, updateVideoDimensions } = useVideoDimensions(videoRef, overlayRef, currentObjectFit)
  const { isPlaying, setIsPlaying, volume, isMuted, togglePlay, toggleMute, handleVolumeChange, toggleFullscreen, setLoading, loading } =
    useVideoControls(videoRef)
  const { currentTime, duration, seekTo, skipTo } = useVideoProgress(videoRef, onTimeUpdate)
  const { overlayMode, setOverlayMode, showOverlays, setShowOverlays } = useOverlayState()
  const { showControls, setShowControls, handleMouseMove } = useAutoHideControls(isPlaying)

  const displayTime = isTranscoding.current ? seekOffset + currentTime : currentTime

  const currentScene = useMemo(
    () => scenes.find((s) => displayTime >= s.startTime && displayTime <= s.endTime) || null,
    [scenes, displayTime],
  )

  // Imperatively update the video src — bypasses React re-render so the
  // browser doesn't cancel the in-flight stream on rapid seeks
  const applyTranscodeSrc = useCallback((src: string) => {
    setTranscodedSrc(src)
    const video = videoRef.current
    if (!video) return
    video.src = src
    setLoading(true)
    video.load()
  }, [])

  const handleSeek = useCallback(
    (time: number) => {
      if (!isTranscoding.current) {
        seekTo(time)
        return
      }

      if (seekDebounce.current) clearTimeout(seekDebounce.current)
      seekDebounce.current = setTimeout(() => {
        const seekTime = Math.floor(time)
        const newSrc = `/internal/media/transcode?source=${encodeURIComponent(source)}&t=${seekTime}`
        setSeekOffset(seekTime)
        applyTranscodeSrc(newSrc)
      }, 300)
    },
    [source, seekTo, applyTranscodeSrc, setSeekOffset],
  )

  // Fires after every src swap — both initial transcode and seeks
  const handleCanPlay = useCallback(() => {
    if (!isTranscoding.current) return
    setTranscodeStatus('ready')
    videoRef.current?.play().catch((err) => {
      console.warn('Autoplay blocked:', err)
    })
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handlePause = () => { setLoading(false); setIsPlaying(false) }
    const handlePlaying = () => { setLoading(false); setIsPlaying(true) }

    const handleError = () => {
      if (transcodeStatus === 'direct' && !transcodedSrc) {
        const startTime = Math.floor(videoRef.current?.currentTime || defaultStartTime || 0)
        const src = `/internal/media/transcode?source=${encodeURIComponent(source)}&t=${startTime}`
        isTranscoding.current = true
        setTranscodeStatus('transcoding')
        setSeekOffset(startTime)
        applyTranscodeSrc(src)
      }
    }

    video.addEventListener('pause', handlePause)
    video.addEventListener('playing', handlePlaying)
    video.addEventListener('error', handleError)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('loadeddata', updateVideoDimensions)
    video.addEventListener('fullscreenchange', updateVideoDimensions)

    return () => {
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('playing', handlePlaying)
      video.removeEventListener('error', handleError)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('loadeddata', updateVideoDimensions)
      video.removeEventListener('fullscreenchange', updateVideoDimensions)
    }
  }, [
    setIsPlaying,
    updateVideoDimensions,
    source,
    transcodedSrc,
    transcodeStatus,
    handleCanPlay,
    applyTranscodeSrc,
    defaultStartTime,
    setSeekOffset,
  ])

  useEffect(() => {
    if (defaultStartTime) skipTo(defaultStartTime)
  }, [defaultStartTime, skipTo])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'o' || e.key === 'O') {
        setCurrentObjectFit((prev) => (prev === 'contain' ? 'cover' : 'contain'))
      }
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  // Cleanup debounce on unmount
  useEffect(() => () => {
    if (seekDebounce.current) clearTimeout(seekDebounce.current)
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[calc(100vh-30rem)] rounded-xl overflow-hidden bg-black group shadow-2xl"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={activeSrc}
        poster={scenes[0]?.thumbnailUrl ? '/thumbnails/' + scenes[0].thumbnailUrl : undefined}
        className="w-full h-full bg-black"
        onClick={togglePlay}
      />

      <AnimatePresence>
        {transcodeStatus === 'transcoding' && (
          <motion.div
            key="transcoding-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <TranscodingOverlay status={transcodeStatus} />
          </motion.div>
        )}
        {loading && transcodeStatus !== 'transcoding' && (
          <motion.div
            key="loading-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <LoadingOverlay />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute overlay inset-0 pointer-events-none" ref={overlayRef}>
        <OverlayManager
          currentScene={currentScene}
          overlayMode={overlayMode}
          showOverlays={showOverlays}
          videoDimensions={videoDimensions}
          videoRef={videoRef}
        />
      </div>

      <AIVisionBadge currentScene={currentScene} showOverlays={showOverlays} showControls={showControls} />

      {title && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: showControls ? 1 : 0, y: showControls ? 0 : -20 }}
          className="absolute top-6 right-6 text-white text-sm font-medium bg-black/60 px-4 py-2 rounded-xl backdrop-blur-md border border-white/10"
        >
          {title}
        </motion.div>
      )}

      {transcodeStatus === 'ready' && (
        <div className="absolute top-0 right-0 px-2 py-0.5 text-xs font-mono font-bold tracking-widest z-10 bg-yellow-500 text-black">
          Transcoded Playback
        </div>
      )}

      <OverlayControls
        showOverlays={showOverlays}
        overlayMode={overlayMode}
        showControls={showControls}
        onToggleOverlays={() => setShowOverlays(!showOverlays)}
        onChangeMode={setOverlayMode}
      />

      {overlayMode === 'all' ||
        (overlayMode === 'captions' && currentScene?.transcription && (
          <LiveCaptions transcription={currentScene?.transcription} />
        ))}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: showControls || !isPlaying ? 1 : 0 }}
        className="absolute bottom-0 w-full h-40 bg-linear-to-t from-black via-black/60 to-transparent pointer-events-none"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: showControls || !isPlaying ? 1 : 0, y: showControls || !isPlaying ? 0 : 20 }}
        className="absolute bottom-20 left-6 right-6 pointer-events-auto z-0"
      >
        <ProgressBar scenes={scenes} duration={duration} currentTime={displayTime} onSeek={handleSeek} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: showControls || !isPlaying ? 1 : 0, y: showControls || !isPlaying ? 0 : 20 }}
        className="absolute bottom-6 left-6 right-6 flex items-center gap-4 pointer-events-auto"
      >
        <PlaybackControls isPlaying={isPlaying} onTogglePlay={togglePlay} />
        <VolumeControl volume={volume} isMuted={isMuted} onToggleMute={toggleMute} onVolumeChange={handleVolumeChange} />
        <div className="flex-1" />
        <FitButton
          onToggle={() => setCurrentObjectFit((prev) => (prev === 'contain' ? 'cover' : 'contain'))}
          currentObjectFit={currentObjectFit}
        />
        <CaptionsButton
          onToggle={() => setOverlayMode(overlayMode === 'captions' || overlayMode === 'all' ? 'none' : 'captions')}
          active={overlayMode === 'captions'}
        />
        <FullscreenButton onToggleFullscreen={() => toggleFullscreen(containerRef)} />
      </motion.div>

      <AnimatePresence>
        {!isPlaying && showControls && !loading && transcodeStatus !== 'transcoding' && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center focus:outline-none pointer-events-auto z-10"
          >
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="w-24 h-24 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center shadow-2xl border-2 border-white/30 hover:bg-white/30 transition-all"
            >
              <svg className="w-12 h-12 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}