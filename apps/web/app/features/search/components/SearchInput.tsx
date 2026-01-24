import { forwardRef, type KeyboardEvent, type ChangeEvent } from 'react'
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useSearchStore } from '~/features/search/stores'

interface SearchInputProps {
  onSearch?: () => void
  onFocus?: () => void
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(({ onSearch, onFocus }, ref) => {
  const { query, setQuery, filters, searchMode, imagePreview, clearSearch } = useSearchStore()

  const hasContent = query.trim().length > 0 || Object.keys(filters).length > 0 || !!imagePreview

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onSearch?.()
    setQuery(e.target.value)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch?.()
    } else if (e.key === 'Escape') {
      setQuery('')
    }
  }

  const handleClear = () => {
    clearSearch()
  }
  const getPlaceholder = () => {
    if (searchMode === 'image' && imagePreview) {
      return 'Image search active...'
    }
    return 'Search scenes, people, objects...'
  }

  return (
    <div
      aria-label='Search'
      className={`relative flex items-center gap-3 px-5 py-4 
        bg-black/5 dark:bg-white/5 
        backdrop-blur-xl
        border transition-all duration-200
        rounded-2xl
        ${
          imagePreview
            ? 'border-black/20 dark:border-white/20 ring-2 ring-black/10 dark:ring-white/10'
            : 'border-black/10 dark:border-white/10'
        }
        focus-within:bg-black/[0.07] dark:focus-within:bg-white/[0.07]
        focus-within:border-black/20 dark:focus-within:border-white/20
        focus-within:shadow-lg focus-within:shadow-black/5 dark:focus-within:shadow-white/5`}
    >
      <MagnifyingGlassIcon className="size-5 text-black/40 dark:text-white/40 shrink-0" />

      <input
        ref={ref}
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={onFocus}
        onKeyDown={handleKeyDown}
        placeholder={getPlaceholder()}
        disabled={searchMode === 'image' && !imagePreview}
        className="flex-1 bg-transparent text-base text-black dark:text-white 
          placeholder:text-black/40 dark:placeholder:text-white/40
          outline-none
          disabled:cursor-not-allowed disabled:opacity-50"
      />

      {hasContent && (
        <button
          onClick={handleClear}
          className="p-1.5 rounded-full 
            bg-black/10 dark:bg-white/10
            hover:bg-black/15 dark:hover:bg-white/15
            transition-all duration-200
            active:scale-95"
          aria-label="Clear search"
        >
          <XMarkIcon className="size-4 text-black/60 dark:text-white/60" />
        </button>
      )}
    </div>
  )
})
