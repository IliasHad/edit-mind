import type { SetupStepConfig } from '../types'

export const SETUP_STEPS: SetupStepConfig[] = [
  {
    id: 'welcome',
    titleKey: 'setup.steps.welcome.title',
    descriptionKey: 'setup.steps.welcome.description',
    skippable: false,
  },
  {
    id: 'services',
    titleKey: 'setup.steps.services.title',
    descriptionKey: 'setup.steps.services.description',
    skippable: false,
  },
  {
    id: 'folder',
    titleKey: 'setup.steps.folder.title',
    descriptionKey: 'setup.steps.folder.description',
    skippable: false,
  },
  {
    id: 'scanning',
    titleKey: 'setup.steps.scanning.title',
    descriptionKey: 'setup.steps.scanning.description',
    skippable: true,
  }
]
