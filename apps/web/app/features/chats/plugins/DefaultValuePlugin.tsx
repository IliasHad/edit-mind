import { useEffect, useRef } from 'react'
import { $getRoot, $createParagraphNode, $createTextNode } from 'lexical'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import type { KnownFace } from '@shared/types/face'
import { FaceMentionNode } from '~/features/chats/utils/FaceMentionNode'

type Token = { type: 'text'; value: string } | { type: 'face'; id: string; name: string; image?: string }

export function DefaultValuePlugin({ value, faces }: { value: Token[] | string; faces: KnownFace[] }) {
  const [editor] = useLexicalComposerContext()
  const lastValue = useRef<string | null>(null)

  useEffect(() => {
    // Skip if value hasn't changed
    const currentValue = typeof value === 'string' ? value : JSON.stringify(value)
    if (lastValue.current === currentValue) return
    lastValue.current = currentValue

    editor.update(() => {
      const root = $getRoot()
      root.clear()

      const paragraph = $createParagraphNode()

      const tokens = typeof value === 'string' ? parseTextWithFaces(value, faces) : value

      tokens.forEach((token) => {
        if (token.type === 'text') {
          paragraph.append($createTextNode(token.value))
        }

        if (token.type === 'face') {
          paragraph.append(new FaceMentionNode(token.id, token.name, token.image))
        }
      })

      root.append(paragraph)
      paragraph.selectEnd()
    })
  }, [editor, value, faces])

  return null
}

function parseTextWithFaces(text: string, faces: KnownFace[]): Token[] {
  const tokens: Token[] = []

  const regex = /@(\w+)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text))) {
    const [fullMatch, name] = match
    const start = match.index
    const end = start + fullMatch.length

    if (start > lastIndex) {
      tokens.push({
        type: 'text',
        value: text.slice(lastIndex, start),
      })
    }

    const face = faces.find((f) => f.name.toLowerCase() === name.toLowerCase())

    if (face) {
      tokens.push({
        type: 'face',
        id: face.name,
        name: face.name,
        image: face.images[0],
      })
    } else {
      // fallback: keep as text
      tokens.push({
        type: 'text',
        value: fullMatch,
      })
    }

    lastIndex = end
  }

  if (lastIndex < text.length) {
    tokens.push({
      type: 'text',
      value: text.slice(lastIndex),
    })
  }

  return tokens
}
