import {
  UserIcon,
  CubeIcon,
  FaceSmileIcon,
  VideoCameraIcon,
  CameraIcon,
  DocumentTextIcon,
  SparklesIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline'

export const SUGGESTION_CONFIG = {
  face: {
    label: 'Faces',
    icon: UserIcon,
    color: 'blue',
  },
  object: {
    label: 'Objects',
    icon: CubeIcon,
    color: 'green',
  },
  emotion: {
    label: 'Emotions',
    icon: FaceSmileIcon,
    color: 'yellow',
  },
  camera: {
    label: 'Cameras',
    icon: CameraIcon,
    color: 'purple',
  },
  shotType: {
    label: 'Shot Types',
    icon: VideoCameraIcon,
    color: 'pink',
  },
  transcription: {
    label: 'Transcript',
    icon: DocumentTextIcon,
    color: 'indigo',
  },
  text: {
    label: 'Detected Text',
    icon: SparklesIcon,
    color: 'orange',
  },
  location: {
    label: 'Locations',
    icon: MapPinIcon,
    color: 'red',
  },
} as const

export const SEARCH_CONFIG = {
  DEBOUNCE_MS: 300,
  MIN_QUERY_LENGTH: 2,
  SUGGESTIONS_LIMIT_PER_GROUP: 5,
  SUGGESTIONS_TOTAL_LIMIT: 30,
  RESULTS_PER_PAGE: 20,
} as const