import { Button } from '@ui/components/Button';

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
  return (
    <div className="pb-10 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center gap-2 mb-8">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <Button
              key={index}
              onClick={() => goToStep(index)}
              className="p-1"
              aria-label={`Go to step ${index + 1}`}
              variant="ghost"
              size="icon-sm"
            >
              <div
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  index === currentStep ? 'w-7 bg-black dark:bg-white' : 'w-1.5 bg-gray-300 dark:bg-gray-700'
                }`}
              />
            </Button>
          ))}
        </div>

        <div className="flex justify-center">
          <Button
            onClick={handleNext}
            aria-label={isLastStep ? 'Get Started' : 'Continue'}
          >
            {isLastStep ? 'Get Started' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  )
}
