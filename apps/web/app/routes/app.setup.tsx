import { AnimatePresence } from 'framer-motion'
import type { MetaFunction } from 'react-router'
import { SetupStep } from '~/features/setup/components/SetupStep'
import { SetupNavigation } from '~/features/setup/components/SetupNavigation'
import { SetupHeader } from '~/features/setup/components/SetupHeader'
import { useSetup } from '~/features/setup/hooks/useSetup'

export const meta: MetaFunction = () => {
    return [{ title: 'Setup | Edit Mind' }]
}

export default function Setup() {
    const setup = useSetup()

    return (
        <div className="flex flex-col h-screen bg-white dark:bg-black font-['SF_Pro_Display','-apple-system','BlinkMacSystemFont','system-ui',sans-serif] antialiased overflow-hidden">
            <SetupHeader
                currentStep={setup.currentStep}
                totalSteps={setup.totalSteps}
                onSkip={setup.handleSkip}
            />

            <div className="flex-1 flex items-center justify-center px-6 min-h-0">
                <div className="w-full max-w-4xl mx-auto">
                    <AnimatePresence mode="wait">
                        <SetupStep
                            key={setup.currentStep}
                            step={setup.activeStep}
                        />
                    </AnimatePresence>
                </div>
            </div>

            <SetupNavigation
                totalSteps={setup.totalSteps}
                currentStep={setup.currentStep}
                goToStep={setup.goToStep}
                handleNext={setup.handleNext}
                handleBack={setup.handleBack}
                isLastStep={setup.isLastStep}
                isFirstStep={setup.isFirstStep}
                canAdvance={setup.canAdvance}
                isLoading={setup.isLoading}
            />
        </div>
    )
}