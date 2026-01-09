import { useEffect, useRef } from 'react'
import type { MetaFunction } from 'react-router'
import { DashboardLayout } from '~/layouts/DashboardLayout'
import { Sidebar } from '~/features/shared/components/Sidebar'
import { SearchInput } from '~/features/search/components/SearchInput'
import { FilterChips } from '~/features/search/components/FilterChips'
import { SuggestionsDropdown } from '~/features/search/components/SuggestionsDropdown'
import { SearchResults } from '~/features/search/components/SearchResults'
import { ImageUpload } from '~/features/search/components/ImageUpload'
import { SearchModeTabs } from '~/features/search/components/SearchModeTabs'
import { useSearchResults } from '~/features/search/hooks/useSearchResults'
import { useSearchSuggestions } from '~/features/search/hooks/useSearchSuggestions'
import { useClickOutside } from '~/features/search/hooks/useClickOutside'

export const meta: MetaFunction = () => {
  return [
    { title: 'Search | Edit Mind' },
    {
      name: 'description',
      content: 'Search your video scenes by faces, objects, emotions, and more',
    },
  ]
}

export default function SearchPage() {
  const { results, total, isLoading, hasQuery, showSuggestions, setShowSuggestions, searchMode } = useSearchResults()

  const { suggestions, hasSuggestions } = useSearchSuggestions(showSuggestions)

  const searchContainerRef = useRef<HTMLDivElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  const handleSearch = () => {
    setShowSuggestions(true)
  }

  useEffect(() => {
    if (hasQuery) {
      setShowSuggestions(true)
    }
  }, [hasQuery, setShowSuggestions])

  useClickOutside([searchContainerRef, suggestionsRef], () => {
    setShowSuggestions(false)
  })

  return (
    <DashboardLayout sidebar={<Sidebar />}>
      <main className="w-full px-8 py-20">
        <div className="max-w-4xl mx-auto mb-16" ref={searchContainerRef}>
          <div className="text-center mb-8">
            <h1 className="text-6xl font-semibold text-black dark:text-white tracking-tight mb-4 leading-tight">
              Search
            </h1>
            <p className="text-lg text-black/60 dark:text-white/60 leading-relaxed">
              Find scenes by text, image, faces, objects, and emotions
            </p>
          </div>

          <div className="mb-6">
            <SearchModeTabs />
          </div>

          <div className="space-y-4">
            {searchMode === 'image' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <ImageUpload />
              </div>
            )}

            <div className="relative animate-in fade-in slide-in-from-top-2 duration-300">
              <SearchInput onSearch={handleSearch} />

              <FilterChips />

              <SuggestionsDropdown
                ref={suggestionsRef}
                suggestions={suggestions}
                show={showSuggestions && hasSuggestions}
              />
            </div>
          </div>
        </div>

        <section className="max-w-7xl mx-auto">
          <SearchResults results={results} total={total} isLoading={isLoading} hasQuery={hasQuery} />
        </section>
      </main>
    </DashboardLayout>
  )
}
