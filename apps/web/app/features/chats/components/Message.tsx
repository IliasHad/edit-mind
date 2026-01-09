import type { ChatMessage } from '@prisma/client'
import type { Scene } from '@shared/schemas'
import { motion } from 'framer-motion'
import { ClockIcon, BoltIcon } from '@heroicons/react/24/solid'
import { StitchedVideo } from './StitchedVideo'
import { useCurrentChat } from '../hooks/useCurrentChat'
import { LoadingIndicator } from './LoadingIndicator'
import { Compiler } from './Compiler'
import { smartFormatDate } from '~/features/shared/utils/date'
import { ExportedScenes } from './ExportedScenes'
import { useFaces } from '~/features/faces/hooks/useFaces'

interface MessageProps extends ChatMessage {
  outputScenes?: Scene[]
}

export function Message({
  id,
  sender,
  text,
  createdAt,
  tokensUsed,
  outputScenes,
  stitchedVideoPath,
  isThinking,
  stage,
  exportId,
  chatId,
}: MessageProps) {
  const isUser = sender === 'user'
  const { error, messages } = useCurrentChat()

  const isLastMessageStitchingScenes = messages[messages.length - 1].stage === 'stitching'
  const isLastMessageExportingScenes = messages[messages.length - 1].stage === 'exporting_scenes'

  const { knownFaces: faces } = useFaces()

  // Parse text and replace @[Name] with face mentions
  const renderTextWithMentions = (text: string) => {
    const mentionRegex = /@\[([^\]]+)\]/g
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let match

    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index))
      }

      const faceName = match[1]
      const face = faces.find((f) => f.name === faceName)

      parts.push(
        <span
          key={match.index}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-linear-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 border border-purple-200 text-sm font-medium mx-0.5"
        >
          <div className="w-5 h-5 rounded-full shrink-0 bg-linear-to-br from-purple-500 to-indigo-500 overflow-hidden flex items-center justify-center">
            {face && face.images?.length > 0 ? (
              <img src={`/faces/${face?.images[0]}`} alt={faceName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-inherit text-xs font-semibold">{faceName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <span className="text-inherit">@{faceName}</span>
        </span>
      )

      lastIndex = match.index + match[0].length
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }

    return parts.length > 0 ? parts : text
  }

  const isStitching = (stage === 'stitching' && !stitchedVideoPath) || isLastMessageStitchingScenes
  const isExporting = (stage === 'exporting_scenes' && !exportId) || isLastMessageExportingScenes

  // Determine if we should show output scenes
  const shouldShowOutputScenes =
    outputScenes && outputScenes.length > 0 && !exportId && !stitchedVideoPath && !isStitching && !isExporting

  return (
    <div className="space-y-4">
      {isThinking ? (
        <LoadingIndicator stage={stage} selectedScenes={outputScenes} />
      ) : (
        <motion.div
          key={id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className={`flex ${isUser ? 'justify-end' : 'justify-start'} items-end gap-3`}
        >
          <div className={`flex flex-col gap-2 max-w-[75%] ${isUser ? 'items-end' : 'items-start'} `}>
            {error ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="mt-2 px-4 py-3 rounded-2xl bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-sm border border-red-200 dark:border-red-800"
              >
                {error}
              </motion.div>
            ) : (
              text &&
              text.length > 0 && (
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.05, duration: 0.3 }}
                  className={`
                rounded-2xl px-4 py-3 text-base leading-relaxed max-w-max
                font-normal backdrop-blur-sm transition-all duration-200
                ${
                  isUser
                    ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
                    : 'bg-black/5 dark:bg-white/5 text-black/90 dark:text-white/90 border border-black/10 dark:border-white/10'
                }
              `}
                >
                  {renderTextWithMentions(text)}
                </motion.div>
              )
            )}

            {stitchedVideoPath && <StitchedVideo stitchedVideoPath={stitchedVideoPath} />}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.3 }}
              className={`flex items-center gap-3 px-1 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div className="flex items-center gap-1.5 text-xs text-black/40 dark:text-white/40">
                <ClockIcon className="w-3 h-3" strokeWidth={2.5} />
                <span className="font-medium">{smartFormatDate(createdAt)}</span>
              </div>

              {!isUser && tokensUsed > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-500/10 dark:bg-purple-500/10 border border-purple-500/20 dark:border-purple-500/20">
                  <BoltIcon className="w-3 h-3 text-purple-600 dark:text-purple-400" strokeWidth={2.5} />
                  <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                    {tokensUsed.toLocaleString()}
                  </span>
                  <span className="text-xs text-purple-600/60 dark:text-purple-400/60">tokens</span>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}

      {shouldShowOutputScenes && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Compiler outputScenes={outputScenes} isStitching={isStitching} isExporting={isExporting} chatId={chatId} />
        </motion.div>
      )}

      {exportId && !isExporting && <ExportedScenes exportId={exportId} />}
    </div>
  )
}
