import { Button } from '@ui/components/Button';
import { useTranslation } from 'react-i18next'

interface OnboardingNavigationProps {
  totalSteps: number
  currentStep: number
  goToStep: (index: number) => void
  handleNext: () => void
  isLastStep: boolean
}

export function OnboardingNavigation({
  totalSteps,
  currentStep,
  goToStep,
  handleNext,
  isLastStep,
}: OnboardingNavigationProps) {
  const { t } = useTranslation()
  const nextLabel = isLastStep ? t('onboarding.navigation.getStarted') : t('onboarding.navigation.continue')

  return (
    <div className="pb-10 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center gap-2 mb-8">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <button
              key={index}
              onClick={() => goToStep(index)}
              className="p-1"
              aria-label={t('onboarding.navigation.goToStep', { step: index + 1 })}
            >
              <div
                className={`h-1.5 rounded-full transition-all duration-200 ${index === currentStep ? 'w-7 bg-black dark:bg-white' : 'w-1.5 bg-gray-300 dark:bg-gray-700'
                  }`}
              />
            </button>
          ))}
        </div>

        <div className="flex justify-center">
          <Button
            onClick={handleNext}
            aria-label={nextLabel}
          >
            {nextLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
