import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBackground } from "../components/GradientBackground";
import { KineticText } from "../components/KineticText";
import { SafeArea } from "../components/SafeArea";
import { SPRING_CONFIG } from "../constants";

interface Face {
  name: string;
  count: number;
}

interface Props {
  title: string;
  faces: Face[];
}

const CountUp: React.FC<{ to: number; startFrame: number }> = ({
  to,
  startFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: SPRING_CONFIG.gentle,
  });
  const value = interpolate(progress, [0, 1], [0, to]);
  return <span>{Math.round(value)}</span>;
};

const FaceCard: React.FC<{
  face: Face;
  rank: number;
  startFrame: number;
}> = ({ face, rank, startFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const itemSpring = spring({
    frame: frame - startFrame,
    fps,
    config: SPRING_CONFIG.snappy,
  });

  const opacity = interpolate(itemSpring, [0, 1], [0, 1]);
  const x = interpolate(itemSpring, [0, 1], [-50, 0]);
  const scale = interpolate(itemSpring, [0, 1], [0.92, 1]);
  const isTop = rank === 1;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 24,
        padding: "28px 32px",
        borderRadius: 24,
        backgroundColor: isTop
          ? "rgba(255, 45, 85, 0.2)"
          : "rgba(255, 255, 255, 0.1)",
        border: isTop
          ? "2px solid rgba(255, 45, 85, 0.5)"
          : "1px solid rgba(255, 255, 255, 0.2)",
        opacity,
        transform: `translateX(${x}px) scale(${scale})`,
      }}
    >
      <div
        style={{
          fontSize: 64,
          fontWeight: "bold",
          color: isTop ? "#FF2D55" : "rgba(255, 255, 255, 0.4)",
          minWidth: 60,
        }}
      >
        {rank}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3
          style={{
            fontSize: 40,
            fontWeight: 600,
            color: "white",
            margin: "0 0 6px 0",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {face.name}
        </h3>
        <p
          style={{
            fontSize: 24,
            fontWeight: 500,
            color: "rgba(255, 255, 255, 0.6)",
            margin: 0,
          }}
        >
          <CountUp to={face.count} startFrame={startFrame + 10} /> videos
        </p>
      </div>
    </div>
  );
};

export const FacesSlide: React.FC<Props> = ({ title, faces }) => {

  return (
    <AbsoluteFill >
      <GradientBackground gradientIndex={3} />
      <SafeArea>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <KineticText
            text={title}
            animationType="slide-in"
            startFrame={10}
            style={{ marginBottom: 80, fontSize: 70 }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 24,
              width: "100%",
              maxWidth: 600,
            }}
          >
            {faces.slice(0, 5).map((face, index) => (
              <FaceCard
                key={face.name}
                face={face}
                rank={index + 1}
                startFrame={30 + index * 8}
              />
            ))}
          </div>
        </AbsoluteFill>
      </SafeArea>
    </AbsoluteFill>
  );
};
