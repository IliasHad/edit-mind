import type { ComponentType, SVGProps } from 'react'
import {
  HeartIcon,
  MapPinIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  EyeIcon,
  RectangleStackIcon,
  UserIcon,
  ClockIcon,
  TagIcon,
  PuzzlePieceIcon,
} from '@heroicons/react/24/solid'
import type { CollectionType } from '@prisma/client'

type IconType = ComponentType<SVGProps<SVGSVGElement>>

export const ICON_MAP: Record<CollectionType, IconType> = {
  visual_style: EyeIcon,
  subject_matter: RectangleStackIcon,
  emotional_tone: HeartIcon,
  aspect_ratio: VideoCameraIcon,
  time_of_day: ClockIcon,
  use_case: PuzzlePieceIcon,
  people: UserIcon,
  location: MapPinIcon,
  custom: TagIcon,
  geographic_location: MapPinIcon,
  person: UserIcon,
  b_roll: VideoCameraIcon,
  audio: MusicalNoteIcon,
}


export const TYPE_LABEL_KEYS: Record<CollectionType, string> = {
  visual_style: 'collections.types.visual_style',
  subject_matter: 'collections.types.subject_matter',
  emotional_tone: 'collections.types.emotional_tone',
  aspect_ratio: 'collections.types.aspect_ratio',
  time_of_day: 'collections.types.time_of_day',
  use_case: 'collections.types.use_case',
  people: 'collections.types.people',
  location: 'collections.types.location',
  custom: 'collections.types.custom',
  geographic_location: 'collections.types.geographic_location',
  person: 'collections.types.person',
  b_roll: 'collections.types.b_roll',
  audio: 'collections.types.audio',
}