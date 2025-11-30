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

export const HeroSlide: React.FC<Props> = ({ content, title, year }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const yearAnimStart = 10;
  const subtitleAnimStart = 30;
  const statsAnimStart = 50;

  const yearProgress = spring({
    frame: frame - yearAnimStart,
    fps,
    config: { stiffness: 80, damping: 20 },
  });
  const yearOpacity = yearProgress;
  const yearY = interpolate(yearProgress, [0, 1], [30, 0]);

  const subtitleProgress = spring({
    frame: frame - subtitleAnimStart,
    fps,
    config: { stiffness: 80, damping: 20 },
  });
  const subtitleOpacity = subtitleProgress;
  const subtitleY = interpolate(subtitleProgress, [0, 1], [30, 0]);

  const statsProgress = spring({
    frame: frame - statsAnimStart,
    fps,
    config: { stiffness: 80, damping: 20 },
  });
  const statsOpacity = statsProgress;
  const statsY = interpolate(statsProgress, [0, 1], [30, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <GradientBackground gradientIndex={0} />

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
            padding: "0 32px",
          }}
        >
          <div
            style={{
              opacity: yearOpacity,
              transform: `translateY(${yearY}px)`,
              marginBottom: 24,
            }}
          >
            <h1
              style={{
                fontSize: 200,
                fontWeight: "bold",
                letterSpacing: "-0.05em",
                color: "white",
                lineHeight: 1,
              }}
            >
              {year}
            </h1>
          </div>

          <div
            style={{
              opacity: subtitleOpacity,
              transform: `translateY(${subtitleY}px)`,
              marginBottom: 80,
            }}
          >
            <h2
              style={{
                fontSize: 48,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: "rgba(255, 255, 255, 0.9)",
              }}
            >
              {title}
            </h2>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 64,
              marginBottom: 80,
              fontSize: 38,
              opacity: statsOpacity,
              transform: `translateY(${statsY}px)`,
              color: "rgba(255, 255, 255, 0.9)",
            }}
          >
            {content}
          </div>
        </div>
      </SafeArea>
    </AbsoluteFill>
  );
};
