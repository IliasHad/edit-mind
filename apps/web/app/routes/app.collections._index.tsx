import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { MetaFunction } from 'react-router'
import { DashboardLayout } from '~/layouts/DashboardLayout'
import { Sidebar } from '~/features/shared/components/Sidebar'

import { humanizeSeconds } from '~/features/shared/utils/duration'
import { TYPE_LABELS } from '~/features/collections/constants'
import { CollectionCard } from '~/features/collections/components/CollectionCard'
import { useCollections } from '~/features/collections/hooks/useCollections'

export const meta: MetaFunction = () => {
  return [{ title: 'Collections | Edit Mind' }]
}

export default function Collections() {
  const { collections, totalDuration, totalVideos } = useCollections()
  const [selectedType, setSelectedType] = useState<string>('all')

  const filteredCollections = selectedType === 'all' ? collections : collections.filter((c) => c.type === selectedType)

  return (
    <DashboardLayout sidebar={<Sidebar />}>
      <main className="w-full px-8 py-16">
        <div className="mx-auto max-w-[1800px]">
          <div className="mb-16 text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              className="mb-4 text-7xl font-semibold tracking-tight text-black dark:text-white"
            >
              Collections
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
              className="mx-auto max-w-2xl text-lg leading-relaxed text-black/60 dark:text-white/60"
            >
              Intelligent collections powered by AI. Discover your footage organized by style, mood, and content.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="mb-12 flex justify-center gap-16"
          >
            <div className="text-center">
              <div className="mb-1 text-5xl font-semibold tracking-tight text-black dark:text-white">
                {collections.length}
              </div>
              <div className="text-sm font-medium tracking-wide text-black/50 dark:text-white/50">Collections</div>
            </div>
            <div className="text-center">
              <div className="mb-1 text-5xl font-semibold tracking-tight text-black dark:text-white">{totalVideos}</div>
              <div className="text-sm font-medium tracking-wide text-black/50 dark:text-white/50">Videos</div>
            </div>
            <div className="text-center">
              <div className="mb-1 text-5xl font-semibold tracking-tight text-black dark:text-white">
                {humanizeSeconds(totalDuration)}
              </div>
              <div className="text-sm font-medium tracking-wide text-black/50 dark:text-white/50">Duration</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="mb-12 flex justify-center"
          >
            <div className="inline-flex gap-1 rounded-xl bg-black/5 dark:bg-white/5 p-1 border border-black/10 dark:border-white/10">
              <button
                onClick={() => setSelectedType('all')}
                className={`relative rounded-lg px-5 py-2.5 text-sm font-medium tracking-wide transition-all duration-300 ${
                  selectedType === 'all'
                    ? 'text-black dark:text-white'
                    : 'text-black/50 dark:text-white/50 hover:text-black/70 dark:hover:text-white/70'
                }`}
              >
                {selectedType === 'all' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 rounded-lg bg-white dark:bg-black shadow-sm border border-black/10 dark:border-white/10"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative">All</span>
              </button>
              {collections.length > 0 &&
                Object.entries(TYPE_LABELS).map(([type, label]) => {
                  const count = collections.filter((c) => c.type === type).length
                  if (count === 0) return null
                  return (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`relative rounded-lg px-5 py-2.5 text-sm font-medium tracking-wide transition-all duration-300 ${
                        selectedType === type
                          ? 'text-black dark:text-white'
                          : 'text-black/50 dark:text-white/50 hover:text-black/70 dark:hover:text-white/70'
                      }`}
                    >
                      {selectedType === type && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute inset-0 rounded-lg bg-white dark:bg-black shadow-sm border border-black/10 dark:border-white/10"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <span className="relative">{label}</span>
                    </button>
                  )
                })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            <AnimatePresence mode="popLayout">
              {filteredCollections.map((collection, index) => (
                <motion.div
                  key={collection.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{
                    duration: 0.4,
                    delay: index * 0.03,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                >
                  <CollectionCard collection={collection} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </main>
    </DashboardLayout>
  )
}
