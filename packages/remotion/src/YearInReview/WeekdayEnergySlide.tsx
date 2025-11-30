import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { SafeArea } from "../components/SafeArea";
import { GradientBackground } from "../components/GradientBackground";

interface Props {
  content: string;
  title: string;
  year: number;
}

export const WeekdayEnergySlide: React.FC<Props> = ({ content, title }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProgress = spring({
    frame: frame - 10,
    fps,
    config: { stiffness: 80, damping: 20 },
  });
  const titleOpacity = titleProgress;
  const titleY = interpolate(titleProgress, [0, 1], [30, 0]);

  const contentProgress = spring({
    frame: frame - 30,
    fps,
    config: { stiffness: 80, damping: 20 },
  });
  const contentOpacity = contentProgress;
  const contentY = interpolate(contentProgress, [0, 1], [30, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <GradientBackground gradientIndex={6} />

      <SafeArea>
        <div
          style={{
            position: "relative",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            textAlign: "center",
            padding: "0 48px",
          }}
        >
          <div
            style={{
              opacity: titleOpacity,
              transform: `translateY(${titleY}px)`,
              marginBottom: 40,
            }}
          >
            <h2
              style={{
                fontSize: 64,
                fontWeight: "bold",
                letterSpacing: "-0.03em",
                color: "white",
                lineHeight: 1.2,
              }}
            >
              {title}
            </h2>
          </div>

          <div
            style={{
              opacity: contentOpacity,
              transform: `translateY(${contentY}px)`,
              maxWidth: "800px",
            }}
          >
            <p
              style={{
                fontSize: 46,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                color: "rgba(255, 255, 255, 0.95)",
                lineHeight: 1.4,
              }}
            >
              {content}
            </p>
          </div>
        </div>
      </SafeArea>
    </AbsoluteFill>
  );
};