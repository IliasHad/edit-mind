import { XMarkIcon } from '@heroicons/react/24/outline'
import { useSearchStore } from '../stores'
import { Button } from '@ui/components/Button'
import type { SearchFilters } from '../types'

export function FilterChips() {
  const { filters, removeFilter } = useSearchStore()

  const filterEntries = Object.entries(filters).flatMap(([type, values]) => {
    if (Array.isArray(values)) {
      return values.map((value) => ({ type: type as keyof SearchFilters, value }))
    }
    return [{ type: type as keyof SearchFilters, value: values as string }]
  })

  if (filterEntries.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-2 mt-3" role="list" aria-label="Active filters">
      {filterEntries.map(({ type, value }) => (
        <Button
          key={`${type}-${value}`}
          onClick={() => removeFilter(type, value)}
          rightIcon={<XMarkIcon className="size-3" />}
          aria-label={`Remove ${type} filter: ${value}`}
        >
          <span className="font-medium">{value}</span>
        </Button>
      ))}
    </div>
  )
}