import { Button } from '@ui/components/Button'

interface SetupHeaderProps {
    currentStep: number
    totalSteps: number
    onSkip?: () => void
}

export function SetupHeader({ currentStep, totalSteps, onSkip }: SetupHeaderProps) {
    return (
        <div className="relative flex items-center justify-between px-6 sm:px-8 pt-6 sm:pt-8">
            <span className="text-sm font-semibold text-black dark:text-white tracking-tight select-none">
                Edit Mind
            </span>

            <span className="absolute left-1/2 -translate-x-1/2 text-xs text-gray-400 dark:text-zinc-600 tabular-nums">
                {currentStep + 1} of {totalSteps}
            </span>

            <div className="w-[72px] flex justify-end">
                {onSkip ? (
                    <Button
                        onClick={onSkip}
                        variant="ghost"
                        className="text-[15px] text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white"
                    >
                        Skip
                    </Button>
                ) : (
                    <span />
                )}
            </div>
        </div>
    )
}