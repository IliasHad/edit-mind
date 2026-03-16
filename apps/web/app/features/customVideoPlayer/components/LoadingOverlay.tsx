import { AnimatePresence, motion } from "framer-motion"

export function LoadingOverlay() {
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
                        key="probing"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.3 }}
                        className="text-white/80 text-sm font-medium tracking-wide text-center"
                    >
                        Loading...
                    </motion.p>
                </AnimatePresence>
            </div>

        </div>
    )
}
