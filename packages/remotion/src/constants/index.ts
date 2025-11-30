import { SpringConfig } from "remotion";

export const SLIDE_TYPES = [
  "hero",
  "openingScene",
  "scenes",
  "categories",
  "objects",
  "objectStory",
  "faces",
  "funFacts",
  "weekendPersonality",
  "weekdayEnergy",
  "locations",
  "colorTemperature",
  "moodboard",
  "yourCreativeDNA",
  "vibeScore",
  "rareGems",
  "mostSpokenWords",
  "snapshotOfTheYear",
  "closingScene",
  "share",
] as const;

export type SlideType = typeof SLIDE_TYPES[number];

interface StoryboardSlide {
  type: SlideType;
  duration: number;
}

export const STORYBOARD: readonly StoryboardSlide[] = [
  { type: "hero", duration: 5 },
  { type: "openingScene", duration: 4 },
  { type: "scenes", duration: 5 },
  { type: "categories", duration: 5 },
  { type: "objectStory", duration: 4 },
  { type: "faces", duration: 4 },
  { type: "funFacts", duration: 5 },
  { type: "weekendPersonality", duration: 4 },
  { type: "weekdayEnergy", duration: 4 },
  { type: "locations", duration: 4 },
  { type: "colorTemperature", duration: 4 },
  { type: "moodboard", duration: 5 },
  { type: "yourCreativeDNA", duration: 4 },
  { type: "vibeScore", duration: 4 },
  { type: "rareGems", duration: 4 },
  { type: "mostSpokenWords", duration: 4 },
  { type: "snapshotOfTheYear", duration: 4 },
  { type: "closingScene", duration: 4 },
  { type: "share", duration: 5 },
] as const;

export const FPS = 30;
export const FADE_DURATION_FRAMES = 20;
export const VOLUME_LEVEL = 0.1;
export const VOLUME_FADE_FRAMES = 15;

export const SPRING_CONFIG = {
  gentle: {
    damping: 20,
    mass: 1,
    stiffness: 80,
    overshootClamping: false,
  } as SpringConfig,
  snappy: {
    damping: 15,
    mass: 0.8,
    stiffness: 100,
    overshootClamping: false,
  } as SpringConfig,
  bouncy: {
    damping: 12,
    mass: 1,
    stiffness: 80,
    overshootClamping: false,
  } as SpringConfig,
  smooth: {
    damping: 25,
    mass: 1,
    stiffness: 70,
    overshootClamping: true,
  } as SpringConfig,
  energetic: {
    damping: 10,
    mass: 0.6,
    stiffness: 120,
    overshootClamping: false,
  } as SpringConfig,
} as const;