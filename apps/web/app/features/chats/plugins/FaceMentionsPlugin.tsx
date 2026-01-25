import { LexicalTypeaheadMenuPlugin, MenuOption } from '@lexical/react/LexicalTypeaheadMenuPlugin'
import { $getSelection, $isRangeSelection } from 'lexical'
import { FaceMentionNode } from '../utils/FaceMentionNode'
import { useState } from 'react'
import type { KnownFace } from '@shared/types/face'
import { Button } from '@ui/components/Button'

class FaceOption extends MenuOption {
  face
  constructor(face: KnownFace) {
    super(face.name)
    this.face = face
  }
}

export function FaceMentionsPlugin({ faces }: { faces: KnownFace[] }) {
  const [queryString, setQueryString] = useState<string | null>(null)

  return (
    <LexicalTypeaheadMenuPlugin
      triggerFn={(text) => {
        const match = text.match(/@(\w*)$/)
        if (!match) return null
        return {
          leadOffset: match.index!,
          matchingString: match[1],
          replaceableString: match[0],
        }
      }}
      options={faces
        .filter((face) => queryString && face.name.toLowerCase().includes(queryString.toLowerCase()))
        .map((f) => new FaceOption(f))}
      onSelectOption={(option, nodeToReplace, closeMenu) => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection)) return

        nodeToReplace?.remove()
        selection.insertNodes([new FaceMentionNode(option.face.name, option.face.name, option.face.images[0])])
        closeMenu()
      }}
      onQueryChange={setQueryString}
      menuRenderFn={(anchorRef, { selectedIndex, options, selectOptionAndCleanUp }) =>
        anchorRef.current ? (
          <div className="absolute z-100 flex flex-col gap-2 p-0.5  bg-white dark:bg-zinc-900 min-w-24 max-h-80 overflow-y-auto bottom-full slide-in-from-bottom-2 duration-200">
            {options.map((option, i) => (
              <Button
                variant='ghost'
                key={option.key}
                onClick={() => selectOptionAndCleanUp(option)}
                className={`w-full text-left flex items-center justify-center gap-2 px-3 text-sm rounded ${
                  i === selectedIndex ? 'bg-blue-100 dark:bg-blue-900' : ''
                }`}
              >
                {option.face.images.length > 0 ? (
                  <div className="relative w-10 h-10 flex rounded-full shrink-0 bg-linear-to-br from-purple-500 to-indigo-500 p-0.5 shadow-md">
                    <img
                      src={`/faces/${option.face.images[0]}`}
                      alt={option.face.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-linear-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm shadow-md shrink-0">
                    {option.face.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col items-start flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate w-full">
                    @{option.face.name}
                  </span>
                </div>
              </Button>
            ))}
          </div>
        ) : null
      }
    />
  )
}
