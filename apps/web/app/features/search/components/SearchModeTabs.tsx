import { MagnifyingGlassIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { Button } from '@ui/components/Button'
import { useSearchResults } from '../hooks/useSearchResults'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

const SEARCH_MODES = [
  {
    id: 'text' as const,
    labelKey: 'search.modes.text.label',
    icon: MagnifyingGlassIcon,
    descriptionKey: 'search.modes.text.description',
  },
  {
    id: 'image' as const,
    labelKey: 'search.modes.image.label',
    icon: PhotoIcon,
    descriptionKey: 'search.modes.image.description',
  },
] as const

export function SearchModeTabs() {
  const { searchMode, setSearchMode, loading, clearSearch } = useSearchResults()
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-2 p-1.5">
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
            title={t(mode.descriptionKey)}
          >
            <span>{t(mode.labelKey)}</span>
          </Button>
        )
      })}
    </div>
  )
}
