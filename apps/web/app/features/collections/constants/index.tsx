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
import { CollectionType } from '@prisma/client'

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


export const TYPE_LABELS: Record<CollectionType, string> = {
  visual_style: 'Visual Style',
  subject_matter: 'Subject',
  emotional_tone: 'Emotional Tone',
  aspect_ratio: 'Aspect Ratio',
  time_of_day: 'Time of Day',
  use_case: 'Use Case',          
  people: 'People',
  location: 'Location',
  custom: 'Custom',              
  geographic_location: 'Geographic Location',
  person: 'Person',              
  b_roll: 'B-Roll',
  audio: 'Audio',
}