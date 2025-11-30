import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  OffthreadVideo,
} from "remotion";
import { GradientBackground } from "../components/GradientBackground";
import { KineticText } from "../components/KineticText";
import { SafeArea } from "../components/SafeArea";
import { FONT_FAMILY } from "../constants/theme";
import { MEDIA_URL } from "../constants/media";

interface TopScene {
  thumbnailUrl: string;
  videoSource: string;
  duration: number;
  description?: string;
  objects: string[];
  faces: string[];
  emotions: string[];
}

interface Props {
  title: string;
  content: string;
  currentScene: TopScene;
}

const SceneCard: React.FC<{
  scene: TopScene;
}> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = spring({
    frame: frame,
    fps,
    config: { stiffness: 150, damping: 20 },
  });

  const scale = interpolate(opacity, [0, 1], [0.8, 1]);

  return (
    <AbsoluteFill style={{ opacity, transform: `scale(${scale})` }}>
      <div
        style={{
          position: "relative",
          borderRadius: 32,
          overflow: "hidden",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          aspectRatio: "9/16",
        }}
      >
        <OffthreadVideo
          src={`${MEDIA_URL}/${encodeURIComponent(scene.videoSource)}`}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
          trimBefore={0}
          trimAfter={5 * fps}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(0, 0, 0, 0.7) 0%, transparent 40%)",
          }}
        />
        {scene.description && (
          <div
            style={{ position: "absolute", bottom: 30, left: 30, right: 30 }}
          >
            <KineticText
              text={scene.description}
              startFrame={15}
              animationType="reveal-in"
              style={{ fontSize: 38, textAlign: "left" }}
            />
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

export const ScenesSlide: React.FC<Props> = ({ title, currentScene }) => {
  return (
    <AbsoluteFill>
      <GradientBackground gradientIndex={1} />
      <SafeArea>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <h1
            style={{
              fontFamily: FONT_FAMILY.sans,
              fontSize: 80,
              fontWeight: "bold",
              color: "white",
              textAlign: "center",
            }}
          >
            {title}
          </h1>

          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 850,
              aspectRatio: "9/16",
              marginTop: 60,
            }}
          >
            <SceneCard scene={currentScene} />
          </div>
        </AbsoluteFill>
      </SafeArea>
    </AbsoluteFill>
  );
};
