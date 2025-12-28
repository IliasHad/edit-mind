import { Search, X, Loader2, ArrowUp, ArrowDown } from 'lucide-react'
import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SearchSuggestions } from './SearchSuggestions'
import { useVideoSearch } from '../hooks/useVideoSearch'
import type { Suggestion } from '@search/services/suggestion'

interface SearchInputProps {
  onFocus?: () => void
  onBlur?: () => void
  isFocused?: boolean
  placeholder?: string
  autoFocus?: boolean
  search: ReturnType<typeof useVideoSearch>
}

export function SearchInput({
  onFocus,
  onBlur,
  isFocused = false,
  placeholder = 'Search for anything...',
  autoFocus = false,
  search,
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const [localQuery, setLocalQuery] = useState('')

  const {
    query,
    setQuery,
    isLoading,
    performSearch,
    clearSearch,
    suggestions,
    showSuggestions,
    setShowSuggestions,
    handleSuggestionSelect,
    fetchSuggestions,
  } = search

  useEffect(() => {
    setLocalQuery(query)
  }, [query])

  // Flatten suggestions for keyboard navigation - MUST match order in SearchSuggestions
  const flattenedSuggestions = useMemo(() => {
    const flattened: Array<Suggestion & { groupType: string; globalIndex: number }> = []
    let index = 0

    Object.entries(suggestions).forEach(([type, items]) => {
      items.forEach((item) => {
        flattened.push({ ...item, groupType: type, globalIndex: index })
        index++
      })
    })
    return flattened
  }, [suggestions])

  useEffect(() => {
    if (!isFocused) return

    if (localQuery.length >= 2) {
      const timeoutId = setTimeout(() => {
        fetchSuggestions(localQuery)
      }, 50)

      return () => clearTimeout(timeoutId)
    } else {
      setShowSuggestions(false)
    }
  }, [localQuery, isFocused, fetchSuggestions, setShowSuggestions])

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // CMD/CTRL + K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }

      // Escape to blur and close
      if (e.key === 'Escape' && isFocused) {
        e.preventDefault()
        inputRef.current?.blur()
        setShowSuggestions(false)
        setSelectedSuggestionIndex(-1)
        onBlur?.()
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [isFocused, onBlur, setShowSuggestions])

  useEffect(() => {
    if (autoFocus) {
      const timeoutId = setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
      return () => clearTimeout(timeoutId)
    }
  }, [autoFocus])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setLocalQuery(newValue)
      setQuery(newValue)
      setSelectedSuggestionIndex(-1)
    },
    [setQuery]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const hasSuggestions = flattenedSuggestions.length > 0 && showSuggestions

    switch (e.key) {
      case 'Enter':
        e.preventDefault()

        // If a suggestion is selected, use it
        if (hasSuggestions && selectedSuggestionIndex >= 0) {
          const selectedSuggestion = flattenedSuggestions[selectedSuggestionIndex]
          if (selectedSuggestion) {
            handleSuggestionSelect(selectedSuggestion)
            setSelectedSuggestionIndex(-1)
            setShowSuggestions(false)
          }
        }
        // Otherwise, perform regular search
        else if (localQuery.trim() && !isLoading) {
          performSearch()
          setShowSuggestions(false)
        }
        break

      case 'ArrowDown':
        if (hasSuggestions) {
          e.preventDefault()
          setSelectedSuggestionIndex((prev) => (prev < flattenedSuggestions.length - 1 ? prev + 1 : 0))
        }
        break

      case 'ArrowUp':
        if (hasSuggestions) {
          e.preventDefault()

          setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : flattenedSuggestions.length - 1))
        }
        break

      case 'Escape':
        e.preventDefault()
        if (showSuggestions) {
          setShowSuggestions(false)
          setSelectedSuggestionIndex(-1)
        } else {
          inputRef.current?.blur()
          onBlur?.()
        }
        break

      case 'Tab':
        // Auto-complete with first suggestion on Tab
        if (hasSuggestions && flattenedSuggestions[0]) {
          e.preventDefault()
          const firstSuggestion = flattenedSuggestions[0]
          setLocalQuery(firstSuggestion.text)
          setQuery(firstSuggestion.text)
          setSelectedSuggestionIndex(0)
        }
        break
    }
  }

  const handleFocus = useCallback(() => {
    onFocus?.()
    if (localQuery.length >= 2 && Object.keys(suggestions).length > 0) {
      setShowSuggestions(true)
    }
  }, [onFocus, localQuery, suggestions, setShowSuggestions])

  const handleBlur = useCallback(() => {
    onBlur?.()
    // Delay to allow suggestion clicks to register
    setTimeout(() => {
      setShowSuggestions(false)
    }, 200)
  }, [onBlur, setShowSuggestions])

  const handleClear = useCallback(() => {
    clearSearch()
    setLocalQuery('')
    inputRef.current?.focus()
  }, [clearSearch])

  const handleSuggestionClick = useCallback(
    (suggestion: Suggestion) => {
      handleSuggestionSelect(suggestion)
      setShowSuggestions(false)
      inputRef.current?.focus()
    },
    [handleSuggestionSelect, setShowSuggestions]
  )

  const hasSuggestions = Object.keys(suggestions).length > 0
  const showClearButton = localQuery.length > 0 && !isLoading
  const showEnterHint = isFocused && localQuery.trim() && !isLoading && !hasSuggestions
  const showNavigationHint = isFocused && hasSuggestions && showSuggestions

  return (
    <div className="relative w-full z-500">
      <motion.div
        layout
        animate={{
          scale: isFocused ? 1.02 : 1,
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        className={`
          relative flex items-center gap-3 md:gap-4 px-4 md:px-7 py-4 md:py-6 rounded-2xl md:rounded-3xl
          backdrop-blur-xl border transition-all duration-300
          ${
            isFocused
              ? 'bg-white/15 border-white/30 shadow-[0_0_60px_rgba(255,255,255,0.15),0_20px_40px_rgba(0,0,0,0.3)]'
              : 'bg-white/8 border-white/12 shadow-[0_8px_32px_rgba(0,0,0,0.5)] hover:bg-white/12 hover:border-white/20'
          }
        `}
      >
        <Search
          size={22}
          className={`${isFocused ? 'text-white' : 'text-gray-400'} transition-colors duration-300 shrink-0`}
          strokeWidth={2}
        />

        <input
          ref={inputRef}
          type="text"
          value={localQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="flex-1 bg-transparent border-none outline-none text-base md:text-lg text-white placeholder-gray-500 font-light tracking-wide"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          aria-label="Search videos"
          aria-autocomplete="list"
          aria-controls="search-suggestions"
          aria-expanded={showSuggestions && hasSuggestions}
          aria-activedescendant={selectedSuggestionIndex >= 0 ? `suggestion-${selectedSuggestionIndex}` : undefined}
        />

        <AnimatePresence mode="wait">
          {!isFocused && !localQuery && (
            <motion.div
              key="cmd-k"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm"
            >
              <kbd className="text-xs text-gray-400 font-medium">⌘</kbd>
              <kbd className="text-xs text-gray-400 font-medium">K</kbd>
            </motion.div>
          )}

          {showEnterHint && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="hidden z-300 md:flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 border border-white/10"
            >
              <kbd className="text-xs text-gray-400 font-medium">Enter</kbd>
            </motion.div>
          )}

          {showNavigationHint && (
            <motion.div
              key="nav-hint"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="hidden md:flex items-center gap-2"
            >
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 border border-white/10">
                <ArrowUp size={12} className="text-gray-400" />
                <ArrowDown size={12} className="text-gray-400" />
              </div>
              <span className="text-xs text-gray-500">navigate</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              <Loader2 size={20} className="text-white animate-spin" />
            </motion.div>
          )}

          {showClearButton && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              onClick={handleClear}
              className="p-1.5 hover:bg-white/10 rounded-full transition-all duration-200 active:scale-90"
              aria-label="Clear search"
            >
              <X size={18} className="text-gray-400 hover:text-white transition-colors" strokeWidth={2} />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {isFocused && hasSuggestions && showSuggestions && (
          <SearchSuggestions
            suggestions={suggestions}
            onSelect={handleSuggestionClick}
            isVisible={showSuggestions}
            selectedIndex={selectedSuggestionIndex}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
