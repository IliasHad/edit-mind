import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useState } from "react"
import type { TranscodeStatus } from "../types"
import { useTranslation } from 'react-i18next'

const TRANSCODING_MESSAGE_KEYS = [
    'player.transcoding.messages.inProgress',
    'player.transcoding.messages.preparing',
    'player.transcoding.messages.almostThere',
]

export function TranscodingOverlay({ status }: { status: TranscodeStatus }) {
    const { t } = useTranslation()
    const [messageIndex, setMessageIndex] = useState(0)

    useEffect(() => {
        if (status !== 'transcoding') return
        const interval = setInterval(() => {
            setMessageIndex((i) => (i + 1) % TRANSCODING_MESSAGE_KEYS.length)
        }, 3500)
        return () => clearInterval(interval)
    }, [status])

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-20">
            <div className="relative w-14 h-14 mb-5">
                <svg className="w-14 h-14 animate-spin text-white/20" viewBox="0 0 56 56" fill="none">
                    <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" />
                </svg>
                <svg
                    className="absolute inset-0 w-14 h-14 animate-spin text-white"
                    viewBox="0 0 56 56"
                    fill="none"
                    style={{ animationDuration: '0.9s' }}
                >
                    <circle
                        cx="28" cy="28" r="24"
                        stroke="currentColor" strokeWidth="4"
                        strokeDasharray="150.796" strokeDashoffset="113.097"
                        strokeLinecap="round"
                    />
                </svg>
            </div>
            <div className="h-6 overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.p
                        key={messageIndex}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.3 }}
                        className="text-white/80 text-sm font-medium tracking-wide text-center"
                    >
                        {t(TRANSCODING_MESSAGE_KEYS[messageIndex])}
                    </motion.p>
                </AnimatePresence>
            </div>

            <p className="mt-2 text-white/40 text-xs">
                {t('player.transcoding.description')}
            </p>
        </div>
    )
}
