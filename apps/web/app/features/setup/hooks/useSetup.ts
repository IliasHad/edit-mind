import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router'
import { SETUP_STEPS } from '../constants'
import { useCurrentFolder } from '~/features/folders/hooks/useCurrentFolder'
import { useServices } from '~/features/services/hooks/useServices'

export function useSetup() {
    const navigate = useNavigate()
    const [currentStep, setCurrentStep] = useState(0)
    const [isLoading, setIsLoading] = useState(false)
    const { currentFolder } = useCurrentFolder()
    const { status } = useServices()

    const totalSteps = SETUP_STEPS.length
    const isLastStep = currentStep === totalSteps - 1
    const isFirstStep = currentStep === 0
    const activeStep = SETUP_STEPS[currentStep]

    const canAdvance = useMemo(() => {
        switch (activeStep.id) {
            case 'services':
                return status?.backgroundJobsService && status.mlService
            case 'folder':
                return !!currentFolder
            case 'scanning':
                return currentFolder?.status !== "scanning"
            default:
                return true
        }
    }, [activeStep.id, currentFolder, status])


    const handleNext = useCallback(async () => {
        if (!canAdvance) return

        if (isLastStep) {
            setIsLoading(true)
            if (currentFolder) {
                navigate(`/app/folders/${currentFolder.id}`)
            } else {
                navigate('/app/home')
            }
            return
        }

        setCurrentStep((prev) => prev + 1)
    }, [canAdvance, isLastStep, navigate, currentFolder])

    const handleBack = useCallback(() => {
        if (!isFirstStep) setCurrentStep((prev) => prev - 1)
    }, [isFirstStep])

    const handleSkip = useCallback(async () => {
        if (isLastStep) {
            navigate('/app/home')
            return
        }
        setCurrentStep((prev) => prev + 1)
    }, [isLastStep, navigate])

    const goToStep = useCallback(
        (index: number) => {
            if (index >= 0 && index < totalSteps) setCurrentStep(index)
        },
        [totalSteps]
    )

    return {
        currentStep,
        totalSteps,
        isLastStep,
        isFirstStep,
        isLoading,
        activeStep,
        canAdvance,
        handleNext,
        handleBack,
        handleSkip,
        goToStep,
    }
}