import { useState } from 'react'
import { useSearchParams } from 'react-router';
import type { SortOption, SortOptions, SortOrder } from '../types'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/24/solid'
import { AnimatePresence, motion } from 'framer-motion'

interface SortOptionProps {
  sortOrder: SortOrder
  sortBy: SortOption
  options: SortOptions[]
}

export function SortButton({ sortOrder, options, sortBy }: SortOptionProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const handleSortChange = (newSortBy: SortOption) => {
    const params = new URLSearchParams(searchParams)

    if (newSortBy === sortBy) {
      params.set('sortOrder', sortOrder === 'desc' ? 'asc' : 'desc')
    } else {
      params.set('sortBy', newSortBy)
      params.set('sortOrder', 'desc')
    }

    params.set('page', '1') // Reset to first page when sorting changes
    setSearchParams(params)
    setIsDropdownOpen(false)
  }

  const toggleSortOrder = () => {
    const params = new URLSearchParams(searchParams)
    params.set('sortOrder', sortOrder === 'desc' ? 'asc' : 'desc')
    setSearchParams(params)
  }

  const currentSortOption = options.find((opt) => opt.value === sortBy)

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl
                        bg-white dark:bg-black 
                        text-black dark:text-white
                        border border-black/10 dark:border-white/10
                        hover:bg-black/5 dark:hover:bg-white/5
                        transition-all"
        >
          <span>{currentSortOption?.label}</span>
          <ChevronUpDownIcon className="size-4 text-black/40 dark:text-white/40" />
        </button>

        <AnimatePresence>
          {isDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />

              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-2 w-56 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-xl overflow-hidden z-20"
              >
                <div className="p-2">
                  {options.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleSortChange(option.value)}
                      className={`
                                    w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl text-sm font-medium
                                    transition-all
                                    ${
                                      sortBy === option.value
                                        ? 'bg-white dark:bg-white text-black'
                                        : 'text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5'
                                    }
                                  `}
                    >
                      <div className="flex items-center gap-2">
                        <span>{option.label}</span>
                      </div>
                      {sortBy === option.value && <CheckIcon className="size-4" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <button
        onClick={toggleSortOrder}
        className="inline-flex items-center justify-center w-10 h-10 rounded-xl
                      bg-white dark:bg-black 
                      border border-black/10 dark:border-white/10
                      hover:bg-black/5 dark:hover:bg-white/5
                      transition-all"
        title={sortOrder === 'desc' ? 'Sort descending' : 'Sort ascending'}
      >
        <svg
          className={`w-5 h-5 text-black dark:text-white transition-transform ${
            sortOrder === 'asc' ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  )
}
