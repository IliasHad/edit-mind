import { type MetaFunction } from 'react-router';
import { DashboardLayout } from '~/layouts/DashboardLayout'
import { Sidebar } from '~/features/shared/components/Sidebar'
import type { Scene } from '@shared/types/scene'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCurrentCollectionScenes } from '~/features/collections/hooks/useCurrentCollectionScenes'
import { ScenePlayerModal } from '~/features/collections/components/ScenePlayerModal'
import { SceneCard } from '~/features/chats/components/SceneCard'
import { ArrowDownTrayIcon } from '@heroicons/react/24/solid'

export const meta: MetaFunction = () => {
  return [{ title: 'Collection Scenes | Edit Mind' }]
}

export default function CollectionScenes() {
  const { currentScenes, loading, exportCollectionSelectedScenes, id } = useCurrentCollectionScenes()

  const [selectedScenes, setSelectedScenes] = useState<Set<string>>(new Set())
  const [activeScene, setActiveScene] = useState<Scene | null>(null)

  const toggleSceneSelection = (sceneId: string) => {
    const newSelection = new Set(selectedScenes)
    if (newSelection.has(sceneId)) {
      newSelection.delete(sceneId)
    } else {
      newSelection.add(sceneId)
    }
    setSelectedScenes(newSelection)
  }

  const handleExport = async () => {
    if (id) {
      await exportCollectionSelectedScenes(id, Array.from(selectedScenes))
    }
  }

  return (
    <DashboardLayout sidebar={<Sidebar />}>
      <main className="w-full px-8 py-12 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="mx-auto max-w-[1800px]"
        >
          <div className="mb-8 flex items-center justify-between">
            <AnimatePresence>
              {selectedScenes.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-3"
                >
                  <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                    {selectedScenes.size} scene{selectedScenes.size > 1 ? 's' : ''} selected
                  </span>
                  <button
                    onClick={() => setSelectedScenes(new Set())}
                    className="text-sm font-medium text-zinc-500 hover:text-black dark:hover:text-white"
                  >
                    Clear
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {currentScenes.map((scene) => (
              <SceneCard
                key={scene.id}
                scene={scene}
                isSelected={selectedScenes.has(scene.id)}
                onSelect={() => toggleSceneSelection(scene.id)}
                onPreview={() => setActiveScene(scene)}
              />
            ))}
          </div>

          {currentScenes.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <h3 className="mb-2 text-xl font-semibold tracking-tight text-black dark:text-white">No scenes found</h3>
            </motion.div>
          )}
        </motion.div>

        <AnimatePresence>
          {activeScene && <ScenePlayerModal scene={activeScene} onClose={() => setActiveScene(null)} />}
        </AnimatePresence>

        <AnimatePresence>
          {selectedScenes.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40"
            >
              <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl shadow-2xl px-6 py-4">
                <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                  {selectedScenes.size} selected
                </span>
                <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800" />
                {Array.from(selectedScenes).map((sceneId) => (
                  <input key={sceneId} type="hidden" name="sceneIds" value={sceneId} />
                ))}
                <button
                  disabled={loading}
                  onClick={handleExport}
                  className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-2.5 text-sm font-semibold tracking-wide text-white transition-all hover:bg-zinc-800 active:scale-[0.98] dark:bg-white dark:text-black dark:hover:bg-zinc-100"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  Export Scenes
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </DashboardLayout>
  )
}
