const shell = {
  navigation: {
    dashboard: 'Dashboard',
    search: 'Search',
    newChat: 'New Chat',
    collections: 'Collections',
    projects: 'Projects',
    faceTraining: 'Face Training',
    jobs: 'Jobs',
    settings: 'Settings',
    logout: 'Logout',
    github: 'Star us on GitHub',
  },
  services: {
    backgroundJobs: 'Background Jobs',
    mlService: 'ML Service',
  },
  pagination: {
    previous: 'Previous',
    next: 'Next',
    pageOf: 'Page {{page}} of {{total}}',
  },
  videoCard: {
    previewUnavailable: 'Preview unavailable',
    untitledVideo: 'Untitled Video',
    thumbnailAlt: '{{name}} thumbnail',
    view: 'View {{name}}',
    viewDetails: 'View {{name}} details',
    facesDetected_one: '{{count}} face detected',
    facesDetected_other: '{{count}} faces detected',
    objectsDetected_one: '{{count}} object detected',
    objectsDetected_other: '{{count}} objects detected',
  },
  toggle: {
    useSetting: 'Use setting',
  },
  version: {
    available: 'v{{version}} available',
    viewReleases: 'View releases',
  },
} as const

export default shell
