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

interface LocationData {
  name: string;
  count: number;
}

interface Props {
  title: string;
  locations: LocationData[];
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
  });
  const value = interpolate(progress, [0, 1], [0, to]);
  return <span>{Math.round(value)}</span>;
};

const LocationCard: React.FC<{
  location: LocationData;
  percentage: number;
  isTop: boolean;
  startFrame: number;
}> = ({ location, percentage, isTop, startFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const itemSpring = spring({
    frame: frame - startFrame,
    fps,
    config: SPRING_CONFIG.snappy,
  });

  const opacity = interpolate(itemSpring, [0, 1], [0, 1]);
  const x = interpolate(itemSpring, [0, 1], [-40, 0]);
  const barWidth = interpolate(itemSpring, [0.2, 1], [0, percentage], {
    extrapolateLeft: "clamp",
  });

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 20,
        border: isTop
          ? "2px solid #30D158"
          : "1px solid rgba(255, 255, 255, 0.2)",
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        opacity,
        transform: `translateX(${x}px)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: isTop
            ? "rgba(48, 209, 88, 0.3)"
            : "rgba(255, 255, 255, 0.1)",
          width: `${barWidth}%`,
        }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "24px 28px",
        }}
      >
        <h3
          style={{
            fontSize: 48,
            fontWeight: 600,
            color: "white",
            margin: 0,
          }}
        >
          {location.name}
        </h3>
        <span
          style={{
            fontSize: 64,
            fontWeight: "bold",
            color: isTop ? "#30D158" : "white",
            marginLeft: 20,
          }}
        >
          <CountUp to={location.count} startFrame={startFrame + 10} />
        </span>
      </div>
    </div>
  );
};

export const LocationsSlide: React.FC<Props> = ({ title, locations }) => {

  const maxCount = Math.max(...locations.map((l) => l.count), 1);

  return (
    <AbsoluteFill >
      <GradientBackground gradientIndex={0} />
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
            style={{ fontSize: 80, marginBottom: 70 }}
          />

          <div
            style={{
              width: "100%",
              maxWidth: 800,
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            {locations.slice(0, 5).map((location, index) => (
              <LocationCard
                key={location.name}
                location={location}
                percentage={(location.count / maxCount) * 100}
                isTop={index === 0}
                startFrame={30 + index * 6}
              />
            ))}
          </div>
        </AbsoluteFill>
      </SafeArea>
    </AbsoluteFill>
  );
};
