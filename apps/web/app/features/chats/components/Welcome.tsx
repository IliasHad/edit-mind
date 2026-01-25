import type { ChatSuggestion } from '@shared/types/chat'
import { useChatSuggestions } from '../hooks/useChatSuggestions'
import { Button } from '@ui/components/Button'

interface WelcomeProps {
  onSuggestionClick: (text: string) => void
  suggestions: ChatSuggestion[]
}

export function Welcome({ onSuggestionClick, suggestions }: WelcomeProps) {
  const { loading } = useChatSuggestions()
  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-12">
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-linear-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-full border border-purple-200/50 dark:border-purple-800/50">
          <span className="text-md font-medium text-purple-700 dark:text-purple-300">
            My videos gallery's second brain
          </span>
        </div>

        <h2 className="text-4xl sm:text-6xl font-bold tracking-tight leading-[1.1] text-gray-900 dark:text-white">
          What videos are you
          <br className="hidden sm:block" />
          <span className="bg-linear-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            {' '}
            looking for?
          </span>
        </h2>
        <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Describe what you want to see and I'll find the perfect clips for you
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 w-full max-w-2xl">
        {loading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="group relative px-6 py-5 text-left rounded-2xl border border-black/5 dark:border-white/10 bg-black/2 dark:bg-white/2"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-black/5 dark:bg-white/10 rounded-full animate-pulse" />

                  <div className="flex-1 space-y-2.5">
                    <div className="h-3.5 bg-black/5 dark:bg-white/10 rounded-md w-3/4 animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : (
          suggestions.map((s, i) => (
            <Button
              key={i}
              onClick={() => onSuggestionClick(s.text)}
              variant="ghost"
              className={`group relative px-6 py-5 text-left rounded-2xl border-l-2 ${s.border} hover:border-opacity-80 cursor-pointer transition-all duration-300`}
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl group-hover:scale-110 transition-transform duration-300">{s.icon}</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{s.text}</span>
              </div>
              <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-white/0 to-white/5 dark:from-white/0 dark:to-white/5 opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
            </Button>
          ))
        )}
      </div>

      {!loading && (
        <p className="text-md text-gray-500 dark:text-gray-500 pt-2 flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          Try to be specific about what you're looking for
        </p>
      )}
    </div>
  )
}
