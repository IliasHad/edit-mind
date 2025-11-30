import React, { useMemo } from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { z } from "zod";
import { GradientBackground } from "../components/GradientBackground";
import { KineticText } from "../components/KineticText";
import { SafeArea } from "../components/SafeArea";
import { SPRING_CONFIG } from "../constants";

export const categoriesSlideSchema = z.object({
  title: z.string(),
  content: z.string(),
});

type CategoriesSlideProps = z.infer<typeof categoriesSlideSchema>;

interface CategoryData {
  name: string;
  value: number;
  color: string;
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

const CategoryCard: React.FC<{
  category: CategoryData;
  startFrame: number;
  index: number;
}> = ({ category, startFrame, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const itemSpring = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 85, stiffness: 130, mass: 1 },
  });

  const opacity = interpolate(itemSpring, [0, 1], [0, 1]);
  const scale = interpolate(itemSpring, [0, 1], [0.88, 1]);
  const x = interpolate(itemSpring, [0, 1], [index % 2 === 0 ? -60 : 60, 0]);

  const barProgress = spring({
    frame: frame - (startFrame + 12),
    fps,
    config: { damping: 90, stiffness: 140, mass: 1 },
  });
  const barWidth = interpolate(barProgress, [0, 1], [0, category.value]);

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 20,
        backgroundColor: "rgba(255, 255, 255, 0.06)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        opacity,
        transform: `scale(${scale}) translateX(${x}px)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: `${barWidth}%`,
          background: `linear-gradient(90deg, ${category.color}40 0%, ${category.color}20 100%)`,
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "26px 32px",
          gap: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <h3
            style={{
              fontSize: 36,
              fontWeight: 600,
              color: "white",
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            {category.name}
          </h3>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 4,
          }}
        >
          <span
            style={{
              fontSize: 72,
              fontWeight: "bold",
              color: category.color,
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
            }}
          >
            <CountUp to={category.value} startFrame={startFrame + 15} />
          </span>
          <span
            style={{
              fontSize: 36,
              fontWeight: 600,
              color: "rgba(255, 255, 255, 0.5)",
            }}
          >
            %
          </span>
        </div>
      </div>
    </div>
  );
};

export const CategoriesSlide: React.FC<CategoriesSlideProps> = ({
  title,
  content,
}) => {
  const COLORS = useMemo(
    () => ["#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe", "#ede9fe"],
    [],
  );

  const categories = Array.from(content.matchAll(/([\w\s]+):\s*(\d+)%/g)).map(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ([_, name, percent], index) => ({
      name: name.trim(),
      value: parseInt(percent),
      color: COLORS[index % COLORS.length],
    }),
  );

  return (
    <AbsoluteFill>
      <GradientBackground gradientIndex={3} />
      <SafeArea>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 50px",
          }}
        >
          <KineticText
            text={title}
            animationType="slide-in"
            startFrame={10}
            style={{
              marginBottom: 70,
              fontSize: 64,
              textAlign: "center",
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              width: "100%",
              maxWidth: 600,
            }}
          >
            {categories.slice(0, 5).map((category, index) => (
              <CategoryCard
                key={category.name}
                category={category}
                startFrame={35 + index * 6}
                index={index}
              />
            ))}
          </div>
        </AbsoluteFill>
      </SafeArea>
    </AbsoluteFill>
  );
};
