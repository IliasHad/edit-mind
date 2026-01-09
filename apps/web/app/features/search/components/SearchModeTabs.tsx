import { MagnifyingGlassIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { useSearchStore } from '~/features/search/stores'

const SEARCH_MODES = [
  {
    id: 'text' as const,
    label: 'Text',
    icon: MagnifyingGlassIcon,
    description: 'Search by keywords',
  },
  {
    id: 'image' as const,
    label: 'Image',
    icon: PhotoIcon,
    description: 'Search by image and text',
  },
] as const

export function SearchModeTabs() {
  const { searchMode, setSearchMode, isLoading, clearSearch } = useSearchStore()

  return (
    <div className="flex items-center gap-2 p-1.5 bg-black/5 dark:bg-white/5 rounded-xl border border-black/10 dark:border-white/10">
      {SEARCH_MODES.map((mode) => {
        const Icon = mode.icon
        const isActive = searchMode === mode.id

        return (
          <button
            key={mode.id}
            onClick={() => {
              if (!isLoading) {
                setSearchMode(mode.id)
                clearSearch()
              }
            }}
            disabled={isLoading}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
            text-sm font-medium transition-all duration-200
            disabled:opacity-40 disabled:cursor-not-allowed
            ${
              isActive
                ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
                : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            title={mode.description}
          >
            <Icon className="size-4" />
            <span>{mode.label}</span>
          </button>
        )
      })}
    </div>
  )
}
