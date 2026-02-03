import { forwardRef } from 'react'
import type { GroupedSuggestions } from '@shared/types/search'
import { SUGGESTION_CONFIG } from '../constants'
import { SuggestionSection } from './SearchSuggestions'
import type { SearchFiltersType } from '../types'

interface SuggestionsDropdownProps {
  suggestions: GroupedSuggestions
  show: boolean
}

export const SuggestionsDropdown = forwardRef<HTMLDivElement, SuggestionsDropdownProps>(
  ({ suggestions, show }, ref) => {
    const hasSuggestions = Object.keys(suggestions).some((key) => suggestions[key]?.length > 0)

    if (!show || !hasSuggestions) {
      return null
    }

    return (
      <div
        ref={ref}
        className="absolute top-full left-0 right-0 mt-2 
        bg-white dark:bg-black
        backdrop-blur-xl
        border border-black/10 dark:border-white/10
        rounded-2xl
        shadow-2xl shadow-black/10 dark:shadow-white/5
        overflow-hidden
        z-50
        animate-in fade-in slide-in-from-top-2 duration-200"
        role="listbox"
      >
        <div className="max-h-[70vh] overflow-y-auto p-2">
          {Object.entries(suggestions).map(([key, items]) => {
            const config = SUGGESTION_CONFIG[key as SearchFiltersType]
            const type = key as SearchFiltersType


            if (!config || items.length === 0) {
              return null
            }

            return (
              <SuggestionSection
                key={type}
                title={config.label}
                icon={config.icon}
                items={items}
                type={type}
              />
            )
          })}
        </div>
      </div>
    )
  }
)

SuggestionsDropdown.displayName = 'SuggestionsDropdown'