import type { Job } from '@prisma/client'
import {
  VideoCameraIcon,
  LanguageIcon,
  PhotoIcon,
  SpeakerWaveIcon,
  CubeIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

export const JobStageIcon = ({ stage }: { stage: Job['stage'] }) => {
  switch (stage) {
    case 'starting':
      return <SparklesIcon className="w-4 h-4" />
    case 'transcribing':
      return <LanguageIcon className="w-4 h-4" />
    case 'frame_analysis':
      return <VideoCameraIcon className="w-4 h-4" />
    case 'creating_scenes':
      return <CubeIcon className="w-4 h-4" />
    case 'embedding_text':
      return <LanguageIcon className="w-4 h-4" />
    case 'embedding_visual':
      return <PhotoIcon className="w-4 h-4" />
    case 'embedding_audio':
      return <SpeakerWaveIcon className="w-4 h-4" />
    default:
      return null
  }
}