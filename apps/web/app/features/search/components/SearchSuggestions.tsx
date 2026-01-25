import type { ComponentType } from 'react'
import { useSearchSuggestions } from '../hooks/useSearchSuggestions'
import { Button } from '@ui/components/Button'

interface Suggestion {
  text: string
  count: number
  sceneCount?: number
}

interface SuggestionSectionProps {
  title: string
  icon: ComponentType<{ className?: string }>
  items: Suggestion[]
  type: string
}

export function SuggestionSection({ title, icon: Icon, items, type }: SuggestionSectionProps) {
  const { filters, addFilter, removeFilter, clearQuery } = useSearchSuggestions()

  const selectedItems = (filters[type as keyof typeof filters] as string[]) || []

  const handleClick = (item: Suggestion) => {
    if (item && selectedItems.includes(item.text)) {
      removeFilter(type, item.text)
    } else {
      addFilter(type, item.text)
      clearQuery()
    }
  }

  if (items.length === 0) {
    return null
  }

  return (
    <div className="mb-2">
      <div className="px-3 py-2 flex items-center gap-2">
        <Icon className="size-4 text-black/40 dark:text-white/40" />
        <span className="text-xs font-semibold text-black/50 dark:text-white/50 uppercase tracking-wider">{title}</span>
      </div>

      <div className="space-y-0.5" role="list">
        {items
          .filter((item) => item)
          .map((item, index) => {
            const isSelected = item && selectedItems.includes(item.text)

            return (
              <Button
                key={`${title}-${index}`}
                onClick={() => handleClick(item)}
                variant={isSelected ? 'primary' : 'ghost'}
                className="w-full px-3 py-2.5 text-left flex items-center justify-between gap-2"
                aria-pressed={isSelected}
                role="checkbox"
              >
                <span className="truncate">{item.text}</span>

                <span
                  className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                    isSelected
                      ? 'bg-white/20 dark:bg-black/20'
                      : 'bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/50'
                  }`}
                >
                  {item.sceneCount || Math.round(item.count)}
                </span>
              </Button>
            )
          })}
      </div>
    </div>
  )
}
