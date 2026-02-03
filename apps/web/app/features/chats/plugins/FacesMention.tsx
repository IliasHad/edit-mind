import { ArrowPathIcon } from '@heroicons/react/24/solid'
import { Button } from '@ui/components/Button'
import { useState, useRef, useEffect } from 'react'
import { useFacesStore } from '~/features/faces/stores'

interface Face {
  name: string
  image?: string
}

interface FaceMention {
  face: Face
  startIndex: number
  endIndex: number
}

interface FacesMentionProps {
  input: string
  setInput: (value: string) => void
}

export function FacesMention({ input, setInput }: FacesMentionProps) {
  const [showFaceMentions, setShowFaceMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionStartIndex, setMentionStartIndex] = useState(0)
  const [faceMentions, setFaceMentions] = useState<FaceMention[]>([])
  const faceMentionsRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const { knownFaces: faces, fetchKnownFaces: fetchFaces, loading: facesLoading } = useFacesStore()

  useEffect(() => {
    fetchFaces()
  }, [fetchFaces])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (faceMentionsRef.current && !faceMentionsRef.current.contains(event.target as Node)) {
        setShowFaceMentions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Parse and find all face mentions in the input
  // Supports names with spaces: @[John Doe] or @John_Doe
  useEffect(() => {
    const mentions: FaceMention[] = []

    // Pattern 1: @[Name With Spaces]
    const bracketPattern = /@\[([^\]]+)\]/g
    let match

    while ((match = bracketPattern.exec(input)) !== null) {
      const mentionedName = match[1]
      const face = faces?.find((f) => f.name.toLowerCase() === mentionedName.toLowerCase())

      if (face) {
        mentions.push({
          face,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        })
      }
    }

    for (let i = 0; i < input.length; i++) {
      if (input[i] === '@' && input[i + 1] === '[') {
        // Skip bracket mentions
        const closingBracket = input.indexOf(']', i)
        if (closingBracket !== -1) {
          i = closingBracket
        }
      } else if (input[i] === '@' && input[i + 1] !== '[') {
        // Find simple mention
        const restOfString = input.slice(i)
        const simpleMatch = restOfString.match(/^@(\w+)/)

        if (simpleMatch) {
          const mentionedName = simpleMatch[1]
          const face = faces?.find((f) => f.name.toLowerCase() === mentionedName.toLowerCase())

          if (face && !mentions.some((m) => m.startIndex === i)) {
            mentions.push({
              face,
              startIndex: i,
              endIndex: i + simpleMatch[0].length,
            })
          }

          i += simpleMatch[0].length - 1
        }
      }
    }

    // Sort mentions by start index
    mentions.sort((a, b) => a.startIndex - b.startIndex)

    setFaceMentions(mentions)
  }, [input, faces])

  useEffect(() => {
    const lastAtSymbol = input.lastIndexOf('@')
    if (lastAtSymbol !== -1) {
      let afterAt = ''
      let isComplete = false

      // Check if it's a bracket mention
      if (input[lastAtSymbol + 1] === '[') {
        const closingBracket = input.indexOf(']', lastAtSymbol)
        if (closingBracket === -1) {
          // Still typing bracket mention
          afterAt = input.slice(lastAtSymbol + 2)
          isComplete = false
        } else {
          // Bracket mention is complete
          isComplete = true
        }
      } else {
        // Simple mention
        afterAt = input.slice(lastAtSymbol + 1)
        const hasSpaceAfter = afterAt.includes(' ')
        isComplete = hasSpaceAfter
      }

      if (!isComplete) {
        setShowFaceMentions(true)
        setMentionQuery(afterAt.toLowerCase())
        setMentionStartIndex(lastAtSymbol)
      } else {
        setShowFaceMentions(false)
      }
    } else {
      setShowFaceMentions(false)
    }
  }, [input])

  const filteredFaces = faces?.filter((face) => face.name.toLowerCase().includes(mentionQuery)) || []

  const handleSelectFace = (face: Face) => {
    const lastAtSymbol = input.lastIndexOf('@')
    const beforeAt = input.slice(0, lastAtSymbol)

    // Determine the end of current mention
    let afterMentionIndex = lastAtSymbol + 1
    if (input[lastAtSymbol + 1] === '[') {
      const closingBracket = input.indexOf(']', lastAtSymbol)
      afterMentionIndex = closingBracket !== -1 ? closingBracket + 1 : input.length
    } else {
      afterMentionIndex = lastAtSymbol + 1 + mentionQuery.length
    }

    const afterMention = input.slice(afterMentionIndex)

    // Use bracket notation if name has spaces, otherwise simple format
    const mentionText = face.name.includes(' ') ? `@[${face.name}]` : `@${face.name}`

    // Ensure there's a space after the mention if there's more text
    const spacing = afterMention && !afterMention.startsWith(' ') ? ' ' : ''

    setInput(`${beforeAt}${mentionText}${spacing}${afterMention}    `)
    setShowFaceMentions(false)
  }

  const getTextWidth = (text: string): number => {
    if (!measureRef.current) return 0
    measureRef.current.textContent = text
    return measureRef.current.offsetWidth
  }

  return (
    <>
      <span
        ref={measureRef}
        className="absolute invisible whitespace-pre text-[17px] leading-tight"
        style={{
          font: 'inherit',
          fontSize: '17px',
          fontFamily: 'inherit',
        }}
      />

      {faceMentions.map((mention, index) => {
        const textBefore = input.slice(0, mention.startIndex)
        const leftOffset = getTextWidth(textBefore)

        return (
          <div
            key={`${mention.face.name}-${mention.startIndex}-${index}`}
            className="absolute top-1/2 -translate-y-1/2 pointer-events-auto z-1000"
            style={{
              left: `${leftOffset}px`,
            }}
          >
            <div
              className="inline-flex items-center gap-1.5 px-2 py-1 
                         bg-linear-to-br from-purple-100 to-indigo-100 
                         dark:from-purple-900 dark:to-indigo-900
                         rounded-full border border-purple-200 dark:border-purple-700/50
                         shadow-sm hover:shadow-md transition-all duration-150"
            >
              {mention.face.image ? (
                <img
                  src={`/faces/${mention.face.image}`}
                  alt={mention.face.name}
                  className="w-4 h-4 rounded-full object-cover border border-purple-300 dark:border-purple-600"
                />
              ) : (
                <div className="w-4 h-4 rounded-full bg-linear-to-br from-purple-600 to-indigo-400 flex items-center justify-center text-white font-semibold text-[8px]">
                  {mention.face.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-xs font-medium text-purple-900 dark:text-purple-200 whitespace-nowrap">
                {mention.face.name}
              </span>
            </div>
          </div>
        )
      })}

      {showFaceMentions && (
        <div
          ref={faceMentionsRef}
          className="absolute bottom-full left-0 mb-2 w-80 max-h-96 overflow-auto
                     bg-white dark:bg-zinc-900
                     ring-1 ring-black/5 dark:ring-white/10
                     rounded-lg shadow-2xl shadow-black/10 dark:shadow-black/30
                     py-2 z-50"
          style={{
            left: `${getTextWidth(input.slice(0, mentionStartIndex))}px`,
          }}
        >
          {facesLoading ? (
            <div className="flex items-center justify-center py-8">
              <ArrowPathIcon className="w-5 h-5 animate-spin text-zinc-400" />
            </div>
          ) : filteredFaces.length > 0 ? (
            <>
              <div className="px-4 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                Select a face
              </div>
              {filteredFaces.map((face) => {
                const isSelected = faceMentions.some((m) => m.face.name === face.name)
                return (
                  <Button
                    variant='outline'
                    key={face.name}
                    onClick={() => handleSelectFace(face)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5
                               text-sm transition-colors duration-150
                               ${isSelected
                        ? 'bg-purple-50 dark:bg-purple-900/20 opacity-60'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      }`}
                  >
                    {face.images.length > 0 ? (
                      <img
                        src={`/faces/${face.images[0]}`}
                        alt={face.name}
                        className="w-10 h-10 rounded-full object-cover border-2 border-zinc-200 dark:border-zinc-700"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-linear-to-br from-purple-600 to-indigo-400 flex items-center justify-center text-white font-semibold text-sm">
                        {face.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium text-gray-900 dark:text-white">{face.name}</span>
                    {isSelected && (
                      <span className="ml-auto text-xs text-purple-600 dark:text-purple-400">Selected</span>
                    )}
                  </Button>
                )
              })}
            </>
          ) : (
            <div className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No faces found matching "{mentionQuery}"
            </div>
          )}
        </div>
      )}
    </>
  )
}
