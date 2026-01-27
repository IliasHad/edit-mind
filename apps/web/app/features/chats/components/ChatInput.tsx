import type { Project } from '@prisma/client'
import { ArrowPathIcon, PaperAirplaneIcon, FolderOpenIcon } from '@heroicons/react/24/solid'
import type { RefObject } from 'react'
import { useState, useRef, useEffect } from 'react'

import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { $getRoot, $isElementNode, type EditorState } from 'lexical'
import { FaceMentionNode } from '../utils/FaceMentionNode'
import { FaceMentionsPlugin } from '../plugins/FaceMentionsPlugin'
import { DefaultValuePlugin } from '../plugins/DefaultValuePlugin'
import { ClearEditorPlugin } from '../plugins/ClearEditorPlugin'
import { useProjects } from '~/features/projects/hooks/useProjects'
import { ProjectSelector } from './ProjectSelector'
import { useCurrentChat } from '../hooks/useCurrentChat'
import { useFaces } from '~/features/faces/hooks/useFaces'
import { Button } from '@ui/components/Button'

interface ChatInputProps {
  sendMessage: (prompt: string, selectedProjectId?: string) => void
  inputRef?: RefObject<HTMLInputElement | null>
  projects?: Project[]
  selectedSuggestion?: string | null
}

export function ChatInput({ sendMessage, selectedSuggestion }: ChatInputProps) {
  const { projects } = useProjects()
  const { loading, chat } = useCurrentChat()

  const [selectedProject, setSelectedProject] = useState<Project | undefined>(undefined)
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [clearTrigger, setClearTrigger] = useState(0)
  const [input, setInput] = useState('')

  const { knownFaces: faces } = useFaces()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProjectDropdown(false)
      }
    }
    setSelectedProject(projects?.find((project) => project.id === chat?.projectId))

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [projects, chat?.projectId])

  const theme = {}

  function onError(error: Error) {
    console.error(error)
  }

  const initialConfig = {
    namespace: 'Chat',
    theme,
    nodes: [FaceMentionNode],
    onError,
    editable: !loading || !chat?.isLocked,
  }

  function onChange(editorState: EditorState) {
    editorState.read(() => {
      const root = $getRoot()
      const tokens: Array<
        { type: 'text'; value: string } | { type: 'face'; id: string; name: string; image?: string }
      > = []

      root.getChildren().forEach((block) => {
        if (!$isElementNode(block)) return

        block.getChildren().forEach((node) => {
          if (node instanceof FaceMentionNode) {
            tokens.push({
              type: 'face',
              id: node.__id,
              name: node.__name,
              image: node.__image,
            })
            return
          }

          const text = node.getTextContent()
          if (text) {
            tokens.push({
              type: 'text',
              value: text,
            })
          }
        })
      })

      const text = tokens.map((t) => (t.type === 'face' ? `@[${t.name}]` : t.value)).join('')

      setInput(text)
    })
  }

  const handleSend = () => {
    if (input.trim() && !loading && !chat?.isLocked) {
      sendMessage(input, selectedProject?.id)
      setInput('')
      setClearTrigger((prev) => prev + 1)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const getPlaceholder = () => {
    if (selectedProject) return `Search in ${selectedProject.name}...`
    return 'Ask me anything about your videos... Use @ for faces'
  }

  return (
    <footer className="sticky bottom-0 z-100 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-t border-black/5 dark:border-white/10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
        <div
          className={`relative flex items-end gap-2 bg-white/60 dark:bg-white/5 rounded-2xl border transition-all duration-200 px-4 py-3 ${
            isFocused
              ? 'border-black/20 dark:border-white/25 bg-white dark:bg-white/10 shadow-lg'
              : 'border-black/10 dark:border-white/15 shadow-sm hover:shadow-md hover:bg-white/80 dark:hover:bg-white/8'
          } ${chat?.isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          {!chat?.isLocked && projects && projects.length > 0 && (
            <div className="relative shrink-0 mb-1" ref={dropdownRef}>
              <Button
                onClick={() => !loading && !chat?.isLocked && setShowProjectDropdown(!showProjectDropdown)}
                disabled={loading || chat?.isLocked}
                variant="ghost"
                size="icon"
                leftIcon={selectedProject ? (
                  <div className="w-6 h-6 rounded-xl bg-linear-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm shadow-md">
                    {selectedProject.name.charAt(0).toUpperCase()}
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-xl flex items-center justify-center border-2 border-dashed border-black/20 dark:border-white/20">
                    <FolderOpenIcon className="w-3 h-3" />
                  </div>
                )}
                aria-label={selectedProject ? `Project: ${selectedProject.name}` : 'Select project'}
                title={selectedProject ? selectedProject.name : 'Select a project'}
              />

              {showProjectDropdown && (
                <ProjectSelector
                  onSelectProject={(project) => {
                    setSelectedProject(project)
                    setShowProjectDropdown(false)
                  }}
                  selectedProject={selectedProject}
                  projects={projects}
                />
              )}
            </div>
          )}

          {!chat?.isLocked ? (
            <>
              <div
                ref={editorRef}
                className="relative flex-1 min-h-10"
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={handleKeyDown}
              >
                <LexicalComposer initialConfig={initialConfig}>
                  <PlainTextPlugin
                    contentEditable={
                      <ContentEditable
                        className="editor-input outline-none z-0 text-md leading-relaxed text-black dark:text-white min-h-10 py-1"
                        aria-placeholder={getPlaceholder()}
                        placeholder={
                          <div className="absolute top-1 left-0 pointer-events-none text-[15px] text-black/40 dark:text-white/40 select-none">
                            {getPlaceholder()}
                          </div>
                        }
                      />
                    }
                    ErrorBoundary={LexicalErrorBoundary}
                  />
                  <HistoryPlugin />
                  <OnChangePlugin onChange={onChange} />
                  <FaceMentionsPlugin faces={faces} />
                  <ClearEditorPlugin clearTrigger={clearTrigger} />
                  {selectedSuggestion && <DefaultValuePlugin value={selectedSuggestion} faces={faces} />}
                </LexicalComposer>
              </div>
              <Button
                aria-label="Send message"
                onClick={handleSend}
                disabled={!input.trim() || loading || chat?.isLocked}
                loading={loading}
                leftIcon={loading ? <ArrowPathIcon className="w-5 h-5" /> : <PaperAirplaneIcon className="w-5 h-5" />}
                size="icon"
                className="shrink-0 mb-1"
              />
            </>
          ) : (
            <div className="relative flex min-h-10 justify-center items-center text-center w-full">
              {' '}
              {chat.lockReason}
            </div>
          )}
        </div>

        {selectedProject && (
          <div className="flex items-center justify-center gap-2 mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-black/5 dark:bg-white/5 rounded-full">
              <div className="w-4 h-4 rounded-full bg-linear-to-br from-purple-500 to-indigo-500" />
              <span className="text-[13px] text-black/60 dark:text-white/60 font-medium">
                Searching in {selectedProject.name}
              </span>
            </div>
          </div>
        )}
      </div>
    </footer>
  )
}
