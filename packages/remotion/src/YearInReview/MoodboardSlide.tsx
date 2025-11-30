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

export const MoodboardSlide: React.FC<Props> = ({ content, title }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProgress = spring({
    frame: frame - 10,
    fps,
    config: { stiffness: 80, damping: 20 },
  });
  const titleOpacity = titleProgress;
  const titleScale = interpolate(titleProgress, [0, 1], [0.9, 1]);

  const contentProgress = spring({
    frame: frame - 30,
    fps,
    config: { stiffness: 80, damping: 20 },
  });
  const contentOpacity = contentProgress;
  const contentY = interpolate(contentProgress, [0, 1], [30, 0]);

  const moodItems = content.split('•').map(item => item.trim()).filter(Boolean);

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <GradientBackground gradientIndex={8} />

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
              transform: `scale(${titleScale})`,
              marginBottom: 60,
            }}
          >
            <h2
              style={{
                fontSize: 68,
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
              display: "flex",
              flexDirection: "column",
              gap: "24px",
              maxWidth: "900px",
            }}
          >
            {moodItems.map((item, index) => (
              <div
                key={index}
                style={{
                  fontSize: 40,
                  fontWeight: 500,
                  letterSpacing: "-0.01em",
                  color: "rgba(255, 255, 255, 0.95)",
                  opacity: interpolate(
                    frame,
                    [30 + index * 5, 40 + index * 5],
                    [0, 1],
                    { extrapolateRight: "clamp" }
                  ),
                }}
              >
                • {item}
              </div>
            ))}
          </div>
        </div>
      </SafeArea>
    </AbsoluteFill>
  );
};