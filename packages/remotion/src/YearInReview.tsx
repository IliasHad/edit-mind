import {
  Html5Audio,
  staticFile,
  useCurrentFrame,
  interpolate,
  AbsoluteFill,
} from "remotion";
import {
  YearInReviewData,
  TopScene,
  YearInReviewObject,
  YearInReviewFace,
  YearInReviewLocation,
  YearInReviewVideo,
} from "../../shared/schemas/yearInReview";
import { SnapshotOfTheYearSlide } from "./YearInReview/SnapshotOfTheYearSlide";
import { YourCreativeDNASlide } from "./YearInReview/YourCreativeDNASlide";
import { ObjectStorySlide } from "./YearInReview/ObjectStorySlide";
import { WeekendPersonalitySlide } from "./YearInReview/WeekendPersonalitySlide";
import { WeekdayEnergySlide } from "./YearInReview/WeekdayEnergySlide";
import { ColorTemperatureSlide } from "./YearInReview/ColorTemperatureSlide";
import { MoodboardSlide } from "./YearInReview/MoodboardSlide";
import { VibeScoreSlide } from "./YearInReview/VibeScoreSlide";
import { RareGemsSlide } from "./YearInReview/RareGemsSlide";
import { OpeningSceneSlide } from "./YearInReview/OpeningSceneSlide";
import { ClosingSceneSlide } from "./YearInReview/ClosingSceneSlide";
import {
  STORYBOARD,
  SlideType,
  FPS,
  VOLUME_FADE_FRAMES,
  VOLUME_LEVEL,
  FADE_DURATION_FRAMES,
} from "./constants";
import { BeatsProvider } from "./providers/BeatsProvider";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { ScenesSlide } from "./YearInReview/ScenesSlide";
import { CategoriesSlide } from "./YearInReview/CategoriesSlide";
import { FacesSlide } from "./YearInReview/FacesSlide";
import { FunFactsSlide } from "./YearInReview/FunFactsSlide";
import { MostSpokenWordsSlide } from "./YearInReview/MostSpokenWordsSlide";
import { ShareSlide } from "./YearInReview/ShareSlide";
import { LocationsSlide } from "./YearInReview/LocationsSlide";
import { Fragment } from "react/jsx-runtime";
import { HeroSlide } from "./YearInReview/HeroSlide";

interface ExpandedSlide {
  type: SlideType;
  duration: number;
  sceneIndex?: number;
}

interface CommonSlideProps {
  title: string;
  content: string;
  year: number;
}

interface ScenesSlideProps extends CommonSlideProps {
  currentScene: TopScene;
  sceneNumber: number;
  totalScenes: number;
}

interface ObjectsSlideProps extends CommonSlideProps {
  objects: YearInReviewObject[];
}

interface FacesSlideProps extends CommonSlideProps {
  faces: YearInReviewFace[];
}

interface LocationsSlideProps extends CommonSlideProps {
  locations: YearInReviewLocation[];
}

type SlideComponentProps =
  | CommonSlideProps
  | ScenesSlideProps
  | ObjectsSlideProps
  | FacesSlideProps
  | LocationsSlideProps;

type SlideComponent = React.FC<SlideComponentProps>;

const expandStoryboard = (
  storyboard: readonly { type: SlideType; duration: number }[],
  topScenes: TopScene[] | undefined,
): ExpandedSlide[] => {
  return storyboard.flatMap((slide) => {
    if (slide.type === "scenes" && topScenes && topScenes.length > 0) {
      return topScenes.map((_, index) => ({
        ...slide,
        sceneIndex: index,
      }));
    }
    return [slide];
  });
};

const calculateScenesFrameRange = (
  expandedStoryboard: ExpandedSlide[],
): { startFrame: number; endFrame: number } => {
  const scenesIndices = expandedStoryboard
    .map((slide, index) => (slide.type === "scenes" ? index : -1))
    .filter((index) => index !== -1);

  const startFrame = expandedStoryboard
    .slice(0, scenesIndices[0])
    .reduce((total, slide) => total + slide.duration * FPS, 0);

  const sceneDuration =
    STORYBOARD.find((s) => s.type === "scenes")?.duration ?? 0;
  const endFrame = startFrame + scenesIndices.length * sceneDuration * FPS;

  return { startFrame, endFrame };
};

const getSlideComponent = (slideType: SlideType): SlideComponent | null => {
  const componentMap: Partial<Record<SlideType, SlideComponent>> = {
    hero: HeroSlide,
    openingScene: OpeningSceneSlide,
    scenes: ScenesSlide as SlideComponent,
    categories: CategoriesSlide,
    objectStory: ObjectStorySlide,
    faces: FacesSlide as SlideComponent,
    funFacts: FunFactsSlide,
    weekendPersonality: WeekendPersonalitySlide,
    weekdayEnergy: WeekdayEnergySlide,
    locations: LocationsSlide as SlideComponent,
    colorTemperature: ColorTemperatureSlide,
    moodboard: MoodboardSlide,
    yourCreativeDNA: YourCreativeDNASlide,
    vibeScore: VibeScoreSlide,
    rareGems: RareGemsSlide,
    mostSpokenWords: MostSpokenWordsSlide,
    snapshotOfTheYear: SnapshotOfTheYearSlide,
    closingScene: ClosingSceneSlide,
    share: ShareSlide,
  };

  return componentMap[slideType] ?? null;
};

type SlideSpecificProps =
  | ScenesSlideProps
  | ObjectsSlideProps
  | FacesSlideProps
  | LocationsSlideProps
  | CommonSlideProps;

const getSlideSpecificProps = (
  slideType: SlideType,
  data: YearInReviewData,
  commonProps: CommonSlideProps,
  sceneIndex?: number,
): SlideSpecificProps => {
  switch (slideType) {
    case "scenes":
      if (!data.topScenes || sceneIndex === undefined) return commonProps;
      return {
        ...commonProps,
        currentScene: data.topScenes[sceneIndex],
        sceneNumber: sceneIndex + 1,
        totalScenes: data.topScenes.length,
      };
    case "objects":
      return { ...commonProps, objects: data.topObjects };
    case "faces":
      return { ...commonProps, faces: data.topFaces };
    case "locations":
      return { ...commonProps, locations: data.topLocations };
    default:
      return commonProps;
  }
};

export const YearInReview: React.FC<YearInReviewVideo> = ({ data, year }) => {
  const frame = useCurrentFrame();

  const expandedStoryboard = expandStoryboard(STORYBOARD, data.topScenes);
  const { startFrame: scenesStartFrame, endFrame: scenesEndFrame } =
    calculateScenesFrameRange(expandedStoryboard);

  const volume = interpolate(
    frame,
    [
      scenesStartFrame - VOLUME_FADE_FRAMES,
      scenesStartFrame,
      scenesEndFrame,
      scenesEndFrame + VOLUME_FADE_FRAMES,
    ],
    [VOLUME_LEVEL, VOLUME_LEVEL, VOLUME_LEVEL, VOLUME_LEVEL],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <BeatsProvider>
      <AbsoluteFill style={{ backgroundColor: "black" }}>
        <Html5Audio src={staticFile("background-music.wav")} volume={volume} />

        <TransitionSeries>
          {expandedStoryboard.map((slideConfig, index) => {
            const slideData = data.slides.find(
              (s) => s.type === slideConfig.type,
            );

            const commonProps: CommonSlideProps = {
              title: slideData?.title ?? "",
              content: slideData?.content ?? "",
              year,
            };

            const SlideComponent = getSlideComponent(slideConfig.type);
            if (!SlideComponent) return null;

            const allProps = getSlideSpecificProps(
              slideConfig.type,
              data,
              commonProps,
              slideConfig.sceneIndex,
            );

            const durationInFrames = slideConfig.duration * FPS;
            const slideKey =
              slideConfig.sceneIndex !== undefined
                ? `${slideConfig.type}-${slideConfig.sceneIndex}`
                : `${slideConfig.type}-${index}`;

            return (
              <Fragment key={slideKey}>
                <TransitionSeries.Transition
                  presentation={fade()}
                  timing={linearTiming({
                    durationInFrames: FADE_DURATION_FRAMES,
                  })}
                />
                <TransitionSeries.Sequence
                  durationInFrames={durationInFrames}
                  name={slideKey}
                >
                  <SlideComponent {...allProps} />
                </TransitionSeries.Sequence>
              </Fragment>
            );
          })}
        </TransitionSeries>
      </AbsoluteFill>
    </BeatsProvider>
  );
};
