import React, { useState, useRef, useEffect } from 'react'
import type { Scene } from '@shared/schemas'
import { AnimatePresence } from 'framer-motion'
import { SceneCard } from './SceneCard'
import { PreviewModal } from './PreviewModal'

interface VideoResultsProps {
  scenes: Scene[]
  selectedScenes: Set<string>
  handleSelectScene: (sceneId: string) => void
  resetSelectedScenes: () => void
}

export const VideoResults: React.FC<VideoResultsProps> = ({
  scenes,
  selectedScenes,
  handleSelectScene,
  resetSelectedScenes,
}) => {
  const [previewScene, setPreviewScene] = useState<Scene | null>(null)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  const handlePreview = (e: React.MouseEvent, scene: Scene) => {
    e.stopPropagation()
    setPreviewScene(scene)
  }

  const closePreview = () => {
    setPreviewScene(null)
  }

  const scrollToCard = (index: number) => {
    const card = cardRefs.current.get(index)
    if (card) {
      card.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      })
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle keyboard events if preview modal is open
      if (previewScene) return

      // Don't handle if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          setFocusedIndex((prev) => {
            const newIndex = Math.max(0, prev - 1)
            scrollToCard(newIndex)
            return newIndex
          })
          break

        case 'ArrowRight':
          e.preventDefault()
          setFocusedIndex((prev) => {
            const newIndex = Math.min(scenes.length - 1, prev + 1)
            scrollToCard(newIndex)
            return newIndex
          })
          break

        case 'Escape':
          resetSelectedScenes()
          setPreviewScene(null)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [scenes, focusedIndex, previewScene, handleSelectScene, resetSelectedScenes])

  const setCardRef = (index: number) => (el: HTMLDivElement | null) => {
    if (el) {
      cardRefs.current.set(index, el)
    } else {
      cardRefs.current.delete(index)
    }
  }

  return (
    <>
      <div ref={containerRef} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {scenes.map((scene, index) => (
          <div key={scene.id} ref={setCardRef(index)}>
            <SceneCard
              scene={scene}
              isSelected={selectedScenes.has(scene.id)}
              isFocused={index === focusedIndex}
              onSelect={() => handleSelectScene(scene.id)}
              onPreview={(e) => handlePreview(e, scene)}
              onFocus={() => setFocusedIndex(index)}
            />
          </div>
        ))}
      </div>

      <AnimatePresence>
        {previewScene && (
          <PreviewModal
            scene={previewScene}
            isSelected={selectedScenes.has(previewScene.id)}
            onClose={closePreview}
            onToggleSelect={() => handleSelectScene(previewScene.id)}
          />
        )}
      </AnimatePresence>

      <div className="mt-4 text-center text-sm text-black/50 dark:text-white/50">
        Use{' '}
        <kbd className="px-2 py-1 bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70 rounded border border-black/10 dark:border-white/10 font-medium">
          ←
        </kbd>
        <kbd className="px-2 py-1 bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70 rounded border border-black/10 dark:border-white/10 font-medium">
          →
        </kbd>{' '}
        to navigate,{' '}
        <kbd className="px-2 py-1 bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70 rounded border border-black/10 dark:border-white/10 font-medium">
          Hover
        </kbd>{' '}
        to preview,{' '}
        <kbd className="px-2 py-1 bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70 rounded border border-black/10 dark:border-white/10 font-medium">
          Enter
        </kbd>{' '}
        to select
      </div>
    </>
  )
}
