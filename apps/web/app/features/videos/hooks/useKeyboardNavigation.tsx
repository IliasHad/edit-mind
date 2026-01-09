import { useEffect } from 'react'
import { type Scene } from '@shared/types/scene'

interface UseKeyboardNavigationProps {
  activeScene: Scene | null
  scenes: Scene[]
  onSceneChange: (scene: Scene) => void
}

export function useKeyboardNavigation({
  activeScene,
  scenes,
  onSceneChange,
}: UseKeyboardNavigationProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeScene || !scenes) return

      const videoEl = document.querySelector('video')
      if (!videoEl) return

      // Don't intercept if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
        return
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          if (videoEl.paused) {
            videoEl.play()
          } else {
            videoEl.pause()
          }
          break

        case 'ArrowRight': {
          e.preventDefault()
          const currentIndex = scenes.findIndex((s) => s.id === activeScene.id)
          if (currentIndex < scenes.length - 1) {
            const nextScene = scenes[currentIndex + 1]
            videoEl.currentTime = nextScene.startTime
            onSceneChange(nextScene)
          }
          break
        }

        case 'ArrowLeft': {
          e.preventDefault()
          const currentIndex = scenes.findIndex((s) => s.id === activeScene.id)
          if (currentIndex > 0) {
            const prevScene = scenes[currentIndex - 1]
            videoEl.currentTime = prevScene.startTime
            onSceneChange(prevScene)
          }
          break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeScene, scenes, onSceneChange])
}