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
    labelKey: 'search.suggestions.face',
    icon: UserIcon,
    color: 'blue',
  },
  object: {
    labelKey: 'search.suggestions.object',
    icon: CubeIcon,
    color: 'green',
  },
  emotion: {
    labelKey: 'search.suggestions.emotion',
    icon: FaceSmileIcon,
    color: 'yellow',
  },
  camera: {
    labelKey: 'search.suggestions.camera',
    icon: CameraIcon,
    color: 'purple',
  },
  shotType: {
    labelKey: 'search.suggestions.shotType',
    icon: VideoCameraIcon,
    color: 'pink',
  },
  transcription: {
    labelKey: 'search.suggestions.transcription',
    icon: DocumentTextIcon,
    color: 'indigo',
  },
  text: {
    labelKey: 'search.suggestions.text',
    icon: SparklesIcon,
    color: 'orange',
  },
  location: {
    labelKey: 'search.suggestions.location',
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