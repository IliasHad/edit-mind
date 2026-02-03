import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { onboardingSteps } from '../constants/onboarding'

export function useOnboarding() {
  const navigate = useNavigate()
  const totalSteps = onboardingSteps.length

  const [currentStep, setCurrentStep] = useState(0)
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false)

  useEffect(() => {
    const storedStatus = localStorage.getItem('onboarding_complete')
    if (storedStatus === 'true') {
      setIsOnboardingComplete(true)
      navigate('/auth/login')
    }
  }, [navigate])

  const completeOnboarding = useCallback(() => {
    localStorage.setItem('onboarding_complete', 'true')
    setIsOnboardingComplete(true)
    navigate('/auth/login')
  }, [navigate])

  const handleNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1)
    } else {
      completeOnboarding()
    }
  }, [completeOnboarding, currentStep, totalSteps])

  const handleSkip = useCallback(() => {
    completeOnboarding()
  }, [completeOnboarding])

  const goToStep = useCallback(
    (index: number) => {
      if (index >= 0 && index < totalSteps) {
        setCurrentStep(index)
      }
    },
    [totalSteps]
  )

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem('onboarding_complete')
    setIsOnboardingComplete(false)
    setCurrentStep(0)
  }, [])

  const isLastStep = currentStep === totalSteps - 1

  return {
    currentStep,
    handleNext,
    handleSkip,
    goToStep,
    onboardingSteps,
    isLastStep,
    totalSteps,
    isOnboardingComplete,
    completeOnboarding,
    resetOnboarding,
  }
}
