const setup = {
  steps: {
    welcome: {
      title: 'Meet\nEdit Mind',
      description:
        'AI-powered video intelligence for editors. Search your footage by face, emotion, object, or spoken word — in seconds.',
    },
    services: {
      title: 'Starting\nthe engine',
      description:
        'Edit Mind runs a local ML engine and job queue on your machine. No footage ever leaves your device.',
    },
    folder: {
      title: 'Choose your\nlibrary',
      description: 'Point Edit Mind to a folder of video files. You can add more folders later.',
    },
    scanning: {
      title: 'Indexing\nyour library',
      description:
        'Edit Mind is analyzing your footage frame by frame. This runs in the background — feel free to have a coffee or tea in the meanwhile.',
    },
  },
  header: {
    stepOf: '{{current}} of {{total}}',
    skip: 'Skip',
  },
  navigation: {
    goToStep: 'Go to step {{step}}',
    back: 'Back',
    continue: 'Continue',
    openEditMind: 'Open Edit Mind',
    opening: 'Opening…',
  },
  services: {
    backgroundJobs: 'Background Jobs',
    mlService: 'ML Service',
    allOperational: 'All systems operational',
    localProcessing: 'Analysis runs locally — footage never leaves your device',
  },
  folder: {
    selectFirst: 'Select your first folder',
    invalidFormData: 'Invalid folder form data',
    addFailed: 'Failed to add folder:',
  },
} as const

export default setup
