import { Button } from '@ui/components/Button'

interface SetupNavigationProps {
    totalSteps: number
    currentStep: number
    goToStep: (index: number) => void
    handleNext: () => void
    handleBack: () => void
    isLastStep: boolean
    isFirstStep: boolean
    canAdvance?: boolean
    isLoading: boolean
}

export function SetupNavigation({
    totalSteps,
    currentStep,
    goToStep,
    handleNext,
    handleBack,
    isLastStep,
    isFirstStep,
    canAdvance,
    isLoading,
}: SetupNavigationProps) {
    const nextLabel = isLastStep ? 'Open Edit Mind' : 'Continue'

    return (
        <div className="pb-10 px-6">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-center gap-2 mb-8">
                    {Array.from({ length: totalSteps }).map((_, index) => (
                        <button
                            key={index}
                            onClick={() => goToStep(index)}
                            className="p-1"
                            aria-label={`Go to step ${index + 1}`}
                        >
                            <div
                                className={`h-1.5 rounded-full transition-all duration-200 ${index === currentStep
                                    ? 'w-7 bg-black dark:bg-white'
                                    : 'w-1.5 bg-gray-300 dark:bg-gray-700'
                                    }`}
                            />
                        </button>
                    ))}
                </div>

                <div className={`flex items-center ${isFirstStep ? 'justify-center' : 'justify-between'}`}>
                    {!isFirstStep && (
                        <Button
                            onClick={handleBack}
                            variant="ghost"
                            className="text-[15px] text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white"
                            aria-label="Back"
                        >
                            Back
                        </Button>
                    )}

                    <Button
                        onClick={handleNext}
                        disabled={!canAdvance || isLoading}
                        aria-label={nextLabel}
                    >
                        {isLoading ? 'Opening…' : nextLabel}
                    </Button>
                </div>
            </div>
        </div>
    )
}