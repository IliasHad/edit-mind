import type { SetupStepConfig } from '../types'

export const SETUP_STEPS: SetupStepConfig[] = [
  {
    id: 'welcome',
    title: 'Meet\nEdit Mind',
    description:
      'AI-powered video intelligence for editors. Search your footage by face, emotion, object, or spoken word — in seconds.',
    skippable: false,
  },
  {
    id: 'services',
    title: 'Starting\nthe engine',
    description:
      'Edit Mind runs a local ML engine and job queue on your machine. No footage ever leaves your device.',
    skippable: false,
  },
  {
    id: 'folder',
    title: 'Choose your\nlibrary',
    description:
      'Point Edit Mind to a folder of video files. You can add more folders later.',
    skippable: false,
  },
  {
    id: 'scanning',
    title: 'Indexing\nyour library',
    description:
      'Edit Mind is analyzing your footage frame by frame. This runs in the background — feel free to have a coffee or tea in the meanwhile.',
    skippable: true,
  }
]