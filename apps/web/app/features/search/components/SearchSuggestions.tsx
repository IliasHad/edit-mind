import type { Suggestion } from '@search/services/suggestion'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef } from 'react'

interface SearchSuggestionsProps {
  suggestions: Record<string, Suggestion[]>
  onSelect: (suggestion: Suggestion) => void
  isVisible: boolean
  selectedIndex?: number
}

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  face: {
    label: 'People',
    icon: '👤',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  object: {
    label: 'Objects',
    icon: '🎯',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
  },
  emotion: {
    label: 'Emotions',
    icon: '😊',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
  },
  camera: {
    label: 'Cameras',
    icon: '📹',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
  },
  shot_type: {
    label: 'Shot Types',
    icon: '🎬',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
  },
  location: {
    label: 'Locations',
    icon: '📍',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
  },
  transcription: {
    label: 'Spoken Words',
    icon: '💬',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
  },
  text: {
    label: 'Detected Text',
    icon: '📝',
    color: 'text-teal-400',
    bg: 'bg-teal-500/10',
  },
}

export function SearchSuggestions({ suggestions, onSelect, isVisible, selectedIndex = -1 }: SearchSuggestionsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)

  const hasSuggestions = Object.keys(suggestions).length > 0

  useEffect(() => {
    if (selectedIndex >= 0 && selectedRef.current && containerRef.current) {
      const container = containerRef.current
      const selected = selectedRef.current
      const containerRect = container.getBoundingClientRect()
      const selectedRect = selected.getBoundingClientRect()

      if (selectedRect.bottom > containerRect.bottom) {
        selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      } else if (selectedRect.top < containerRect.top) {
        selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [selectedIndex])

  if (!hasSuggestions || !isVisible) return null

  let globalIndex = 0
  const suggestionGroups = Object.entries(suggestions).map(([type, items]) => {
    const itemsWithIndex = items.map((item) => ({
      ...item,
      globalIndex: globalIndex++,
    }))
    return { type, items: itemsWithIndex }
  })

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="absolute z-500 top-full mt-3 w-full rounded-2xl backdrop-blur-xl bg-white/10 border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,0.4)] overflow-hidden"
        id="search-suggestions"
        role="listbox"
      >
        <div ref={containerRef} className="p-2 max-h-[400px] overflow-y-auto custom-scrollbar">
          {suggestionGroups.map(({ type, items }, groupIndex) => {
            const config = TYPE_CONFIG[type] || {
              label: type,
              icon: '•',
              color: 'text-gray-400',
              bg: 'bg-gray-500/10',
            }

            return (
              <motion.div
                key={type}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: groupIndex * 0.05 }}
                className="mb-3 last:mb-0"
              >
                <div className="flex items-center gap-2 px-3 py-2 mb-1">
                  <span className="text-base">{config.icon}</span>
                  <span className={`text-xs font-semibold uppercase tracking-wider ${config.color}`}>
                    {config.label}
                  </span>
                </div>

                <div className="space-y-1">
                  {items.map((suggestion, index) => {
                    const isSelected = suggestion.globalIndex === selectedIndex

                    return (
                      <motion.button
                        key={`${type}-${suggestion.text}-${suggestion.globalIndex}`}
                        ref={isSelected ? selectedRef : null}
                        id={`suggestion-${suggestion.globalIndex}`}
                        role="option"
                        aria-selected={isSelected}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: groupIndex * 0.05 + index * 0.02 }}
                        onClick={() => onSelect(suggestion)}
                        className={`
                          w-full text-left px-3 py-2.5 rounded-lg
                          flex items-center justify-between
                          transition-all duration-200
                          group relative
                          ${isSelected ? 'bg-white/20 shadow-lg scale-[1.02]' : 'hover:bg-white/10 active:bg-white/15'}
                        `}
                      >
                        <span
                          className={`font-medium text-sm transition-colors ${
                            isSelected ? 'text-white' : 'text-gray-200'
                          }`}
                        >
                          {suggestion.text}
                        </span>

                        <div className="flex items-center gap-2">
                          <motion.span
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{
                              opacity: isSelected ? 1 : 0,
                              scale: isSelected ? 1 : 0.8,
                            }}
                            className={`
                              text-xs px-2 py-0.5 rounded-full
                              ${config.bg} ${config.color}
                              transition-opacity duration-200
                              group-hover:opacity-100
                            `}
                          >
                            {Math.round(suggestion.count)} {Math.round(suggestion.count) === 1 ? 'match' : 'matches'}
                          </motion.span>

                          {isSelected && (
                            <motion.span
                              initial={{ opacity: 0, x: -5 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="text-xs text-gray-400 font-medium"
                            >
                              ↵
                            </motion.span>
                          )}
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              </motion.div>
            )
          })}
        </div>

        <div className="border-t border-white/10 px-4 py-2.5 bg-black/20">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white">↑↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white">Enter</kbd>
                select
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white">Esc</kbd>
              close
            </span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
