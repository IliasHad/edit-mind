const onboarding = {
  steps: {
    library: {
      title: 'Your video library,\nreimagined',
      description: 'Index your entire video collection locally with AI-powered analysis. Everything stays on your device.',
    },
    naturalLanguage: {
      title: 'Search with natural language',
      description: "Find any scene instantly. Search by what's spoken, who appears, or what's happening on screen.",
    },
    roughCuts: {
      title: 'AI-generated rough cuts',
      description: 'Describe your sequence in plain English and let AI assemble the perfect rough cut automatically.',
    },
  },
  navigation: {
    skip: 'Skip',
    continue: 'Continue',
    getStarted: 'Get Started',
    goToStep: 'Go to step {{step}}',
    stepContent: 'Step Content',
  },
} as const

export default onboarding
