import React, { useCallback, useEffect, useState } from 'react'
import { VideoResults } from './VideoResults'
import type { Scene } from '@shared/types'
import { motion, AnimatePresence } from 'framer-motion'
import { FilmIcon, ArrowDownTrayIcon } from '@heroicons/react/24/solid'
import { useCurrentChat } from '../hooks/useCurrentChat'
import { Button } from '@ui/components/Button'

interface CompilerProps {
  outputScenes: Scene[]
  isStitching: boolean
  isExporting: boolean
  chatId: string
}

export const Compiler: React.FC<CompilerProps> = ({ outputScenes, isStitching, isExporting, chatId }) => {
  const { stitchMessageScenes, loading, refreshMessages, exportMessageScenes } = useCurrentChat()

  const [selectedScenes, setSelectedScenes] = React.useState<Set<string>>(new Set())
  const [footerHeight, setFooterHeight] = useState(96)

  useEffect(() => {
    const footer = document.querySelector('[data-chat-footer]')
    if (!footer) return
    const update = () => setFooterHeight(footer.getBoundingClientRect().height)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(footer)
    return () => observer.disconnect()
  }, [])

  const handleStitch = async () => {
    if (selectedScenes.size === 0) return
    await stitchMessageScenes(chatId, Array.from(selectedScenes))
    refreshMessages()
  }

  const handleExport = async () => {
    if (selectedScenes.size === 0) return
    await exportMessageScenes(chatId, Array.from(selectedScenes))
    refreshMessages()
  }

  const toggleSceneSelection = useCallback((sceneId: string) => {
    setSelectedScenes((prev) => {
      const next = new Set(prev)
      if (next.has(sceneId)) {
        next.delete(sceneId)
      } else {
        next.add(sceneId)
      }
      return next
    })
  }, [])

  const resetSelectedScenes = useCallback(() => setSelectedScenes(new Set()), [])

  return (
    <>
      <div className="max-w-4xl mx-auto pb-8">
        {outputScenes.length === 0 && (
          <p className="text-black/50 dark:text-white/50 text-sm">No scenes to compile yet.</p>
        )}

        {outputScenes.length > 0 && (
          <>
            <div className="flex justify-end mb-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  selectedScenes.size === outputScenes.length
                    ? setSelectedScenes(new Set())
                    : setSelectedScenes(new Set(outputScenes.map((s) => s.id)))
                }
              >
                {selectedScenes.size === outputScenes.length ? 'Deselect all' : 'Select all'}
              </Button>
            </div>

            <VideoResults
              scenes={outputScenes}
              selectedScenes={selectedScenes}
              resetSelectedScenes={resetSelectedScenes}
              handleSelectScene={toggleSceneSelection}
            />
          </>
        )}
      </div>

      <AnimatePresence>
        {selectedScenes.size > 0 && !isStitching && !isExporting && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ bottom: footerHeight + 12 }}
            className="fixed left-1/2 -translate-x-1/2 z-2000 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-black/85 dark:bg-zinc-900/90 backdrop-blur-xl border border-white/10 shadow-2xl"
          >
            <span className="text-white/60 text-sm font-medium pl-1">
              {selectedScenes.size} scene{selectedScenes.size !== 1 ? 's' : ''}
            </span>

            <div className="w-px h-5 bg-white/15" />

            <Button
              onClick={handleStitch}
              disabled={isStitching || loading}
              loading={isStitching}
              leftIcon={<FilmIcon className="w-4 h-4" />}
            >
              {isStitching ? 'Compiling…' : 'Compile'}
            </Button>

            <Button
              onClick={handleExport}
              disabled={isExporting || loading}
              loading={isExporting}
              leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />}
            >
              {isExporting ? 'Exporting…' : 'Export'}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
