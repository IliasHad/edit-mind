import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useEffect } from 'react'
import { $getRoot, $createParagraphNode } from 'lexical'

interface ClearEditorPluginProps {
  clearTrigger: number
}

export function ClearEditorPlugin({ clearTrigger }: ClearEditorPluginProps) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    if (clearTrigger > 0) {
      editor.update(() => {
        const root = $getRoot()
        root.clear()
        root.append($createParagraphNode())
      })
    }
  }, [clearTrigger, editor])

  return null
}