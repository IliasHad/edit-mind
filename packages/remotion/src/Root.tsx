import "./index.css";
import { Composition } from "remotion";
import { YearInReview } from "./YearInReview";
import {
  YearInReviewData,
  YearInReviewVideoSchema,
} from "../../shared/schemas/yearInReview";
import { FPS, STORYBOARD } from "./constants";
import testData from "../test.json";


const calculateTotalFrames = (scenesCount: number): number => {
  const nonScenesFrames = STORYBOARD
    .filter((slide) => slide.type !== "scenes")
    .reduce((total, slide) => total + slide.duration * FPS, 0);

  const sceneDuration = STORYBOARD.find((slide) => slide.type === "scenes")?.duration ?? 2;
  const scenesFrames = scenesCount * sceneDuration * FPS;

  const minimumFrames = FPS * 60;

  return Math.max(nonScenesFrames + scenesFrames, minimumFrames);
};

export const RemotionRoot: React.FC = () => {
  const totalFrames = calculateTotalFrames(testData.data.topScenes?.length ?? 0);

  return (
    <Composition
      id="YearInReview"
      component={YearInReview}
      durationInFrames={totalFrames}
      fps={FPS}
      width={1080}
      height={1920}
      schema={YearInReviewVideoSchema}
      defaultProps={{
        data: testData.data as YearInReviewData,
        year: testData.year,
      }}
    />
  );
};