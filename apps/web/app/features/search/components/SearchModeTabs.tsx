import { MagnifyingGlassIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { Button } from '@ui/components/Button'
import { useSearchResults } from '../hooks/useSearchResults'
import clsx from 'clsx'

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
  const { searchMode, setSearchMode, loading, clearSearch } = useSearchResults()

  return (
    <div className="flex items-center gap-2 p-1.5 bg-black/5 dark:bg-white/5 rounded-xl border border-black/10 dark:border-white/10">
      {SEARCH_MODES.map((mode) => {
        const Icon = mode.icon
        const isActive = searchMode === mode.id

        return (
          <Button
            key={mode.id}
            onClick={() => {
              if (!loading) {
                setSearchMode(mode.id)
                clearSearch()
              }
            }}
            disabled={loading}
            variant={isActive ? 'primary' : 'ghost'}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 px-4 py-2.5',
              isActive ? 'primary' : 'text-black dark:text-white'
            )}
            leftIcon={<Icon className="size-4" />}
            title={mode.description}
          >
            <span>{mode.label}</span>
          </Button>
        )
      })}
    </div>
  )
}
