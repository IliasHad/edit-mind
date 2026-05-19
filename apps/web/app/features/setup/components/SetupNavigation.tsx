import { Button } from '@ui/components/Button'
import { useTranslation } from 'react-i18next'

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
    const { t } = useTranslation()
    const nextLabel = isLastStep ? t('setup.navigation.openEditMind') : t('setup.navigation.continue')

    return (
        <div className="pb-10 px-6">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-center gap-2 mb-8">
                    {Array.from({ length: totalSteps }).map((_, index) => (
                        <button
                            key={index}
                            onClick={() => goToStep(index)}
                            className="p-1"
                            aria-label={t('setup.navigation.goToStep', { step: index + 1 })}
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
                            aria-label={t('setup.navigation.back')}
                        >
                            {t('setup.navigation.back')}
                        </Button>
                    )}

                    <Button
                        onClick={handleNext}
                        disabled={!canAdvance || isLoading}
                        aria-label={nextLabel}
                    >
                        {isLoading ? t('setup.navigation.opening') : nextLabel}
                    </Button>
                </div>
            </div>
        </div>
    )
}