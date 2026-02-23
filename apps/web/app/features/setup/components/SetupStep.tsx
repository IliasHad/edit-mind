import { motion } from 'framer-motion'
import type { SetupStepConfig } from '../types';
import { ServicesPanel } from './ServicesPanel'
import { FolderPanel } from './FolderPanel'

interface SetupStepProps {
    step: SetupStepConfig
}

const variants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -6 },
}

export function SetupStep({ step }: SetupStepProps) {
    const renderPanel = () => {
        switch (step.id) {
            case 'welcome':
                return null
            case 'services':
                return <ServicesPanel />
            case 'folder':
                return (
                    <FolderPanel />
                )
            case 'scanning':
                return null
        }
    }

    const panel = renderPanel()

    return (
        <motion.div
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
            className={`grid ${panel ? "md:grid-cols-2" : "md:grid-cols-1"} gap-12 md:gap-16 items-center justify-center text-center`}
        >
            {panel &&
                <div className="order-2 md:order-1">
                    <div className="aspect-4/3 rounded-2xl flex items-center justify-center">
                        {panel}
                    </div>
                </div>
            }
            <div className="order-1 md:order-2 space-y-5">
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold text-black dark:text-white tracking-tight leading-[1.1] whitespace-pre-line">
                    {step.title}
                </h1>
                <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
                    {step.description}
                </p>
            </div>
        </motion.div>
    )
}