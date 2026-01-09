import { XMarkIcon } from '@heroicons/react/24/outline'
import { useSearchStore, type SearchFilters } from '../stores'


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
        <button
          key={`${type}-${value}`}
          onClick={() => removeFilter(type, value)}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm
          bg-black dark:bg-white
          text-white dark:text-black
          rounded-lg
          hover:opacity-80
          transition-all duration-200
          active:scale-95
          focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
          aria-label={`Remove ${type} filter: ${value}`}
        >
          <span className="font-medium">{value}</span>
          <XMarkIcon className="size-3" />
        </button>
      ))}
    </div>
  )
}