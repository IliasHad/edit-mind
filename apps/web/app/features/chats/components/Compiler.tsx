import React, { useEffect } from 'react'
import { VideoResults } from './VideoResults'
import type { Scene } from '@shared/schemas'
import { motion } from 'framer-motion'
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
  const { stitchMessageScenes, loading, refreshMessages, messages, exportMessageScenes } = useCurrentChat()

  const [selectedScenes, setSelectedScenes] = React.useState<Set<string>>(new Set())

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

  const toggleSceneSelection = (sceneId: string) => {
    setSelectedScenes((prev) => {
      const next = new Set(prev)

      if (next.has(sceneId)) {
        next.delete(sceneId)
      } else {
        next.add(sceneId)
      }

      return next
    })
  }

  useEffect(() => {
    return () => {
      setSelectedScenes(new Set())
    }
  }, [messages])

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      {outputScenes.length === 0 && (
        <p className="text-black/50 dark:text-white/50 text-sm">No scenes to compile yet.</p>
      )}

      {outputScenes.length > 0 && (
        <VideoResults
          scenes={outputScenes}
          selectedScenes={selectedScenes}
          resetSelectedScenes={() => setSelectedScenes(new Set())}
          handleSelectScene={toggleSceneSelection}
        />
      )}

      {selectedScenes.size > 0 && !isStitching && !isExporting && !loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 justify-end">
          <Button
            onClick={handleStitch}
            disabled={isStitching || loading}
            loading={isStitching}
            leftIcon={<FilmIcon className="w-4 h-4" />}
          >
            {isStitching
              ? 'Compiling...'
              : `Compile ${selectedScenes.size} scene${selectedScenes.size !== 1 ? 's' : ''}`}
          </Button>

          <Button
            onClick={handleExport}
            disabled={isExporting || loading}
            loading={isExporting}
            leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />}
          >
            {isExporting
              ? 'Exporting...'
              : `Export ${selectedScenes.size} scene${selectedScenes.size !== 1 ? 's' : ''}`}
          </Button>
        </motion.div>
      )}
    </div>
  )
}
