import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
} from "remotion";
import { z } from "zod";
import { GradientBackground } from "../components/GradientBackground";
import { SafeArea } from "../components/SafeArea";
import { useBeatSync } from "../hooks/useBeatSync";
import { useBeats } from "../hooks/useBeats";

export const shareSlideSchema = z.object({
  title: z.string(),
  content: z.string(),
  year: z.number(),
});

type ShareSlideProps = z.infer<typeof shareSlideSchema>;

export const ShareSlide: React.FC<ShareSlideProps> = ({
  title,
  content,
  year,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { beatFrames } = useBeats();

  const scale = useBeatSync({ beatFrames: beatFrames, animationType: "pulse" });

  const identityStart = 15;
  const subtitleStart = 50;
  const yearRevealStart = 90;
  const creditStart = 130;
  const fadeOutStart = 250;

  const identitySpring = spring({
    frame: frame - identityStart,
    fps,
    config: { damping: 80, stiffness: 100 },
  });
  const identityOpacity = interpolate(identitySpring, [0, 1], [0, 1]);
  const identityScale = interpolate(identitySpring, [0, 1], [0.85, 1]);
  const identityY = interpolate(identitySpring, [0, 1], [50, 0]);

  const subtitleSpring = spring({
    frame: frame - subtitleStart,
    fps,
    config: { damping: 85, stiffness: 110 },
  });
  const subtitleOpacity = interpolate(subtitleSpring, [0, 1], [0, 1]);
  const subtitleY = interpolate(subtitleSpring, [0, 1], [30, 0]);

  const yearSpring = spring({
    frame: frame - yearRevealStart,
    fps,
    config: { damping: 60, stiffness: 80 },
  });
  const yearScale = interpolate(yearSpring, [0, 1], [3, 1]);
  const yearOpacity = interpolate(yearSpring, [0, 1], [0, 1]);

  const creditOpacity = interpolate(
    frame,
    [creditStart, creditStart + 25],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const fadeOut = interpolate(
    frame,
    [fadeOutStart, fadeOutStart + 30],
    [1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const ambientPulse = 1 + Math.sin(frame * 0.02) * 0.01;

  const particles = Array.from({ length: 20 }, (_, i) => {
    const angle = (i / 20) * Math.PI * 2;
    const distance = interpolate(
      frame,
      [yearRevealStart + 20, yearRevealStart + 60],
      [0, 200],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      },
    );
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      opacity: interpolate(
        frame,
        [yearRevealStart + 20, yearRevealStart + 60, yearRevealStart + 80],
        [0, 0.6, 0],
        {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        },
      ),
    };
  });

  return (
    <AbsoluteFill style={{ transform: `scale(${scale})`, opacity: fadeOut }}>
      <GradientBackground gradientIndex={3} />

      {particles.map((particle, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: i % 2 === 0 ? "#007AFF" : "#5856D6",
            transform: `translate(calc(-50% + ${particle.x}px), calc(-50% + ${particle.y}px))`,
            opacity: particle.opacity,
          }}
        />
      ))}

      <SafeArea>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "0 60px",
          }}
        >
          <div
            style={{
              opacity: identityOpacity,
              transform: `scale(${identityScale * ambientPulse}) translateY(${identityY}px)`,
              marginBottom: 60,
            }}
          >
            <h1
              style={{
                fontSize: 96,
                fontWeight: "bold",
                margin: 0,
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
                color: "rgba(255, 255, 255, 0.9)",
              }}
            >
              {title}
            </h1>
          </div>

          <div
            style={{
              opacity: subtitleOpacity,
              transform: `translateY(${subtitleY}px)`,
              marginBottom: 120,
            }}
          >
            <p
              style={{
                fontSize: 48,
                fontWeight: 500,
                color: "rgba(255, 255, 255, 0.7)",
                margin: 0,
                maxWidth: 700,
                letterSpacing: "-0.01em",
                lineHeight: 1.4,
              }}
            >
              {content}
            </p>
          </div>

          <div
            style={{
              opacity: yearOpacity,
              transform: `scale(${yearScale})`,
            }}
          >
            <p
              style={{
                fontSize: 36,
                fontWeight: 600,
                color: "rgba(255, 255, 255, 0.5)",
                margin: "0 0 24px 0",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              Thank you for
            </p>
            <p
              style={{
                fontSize: 220,
                fontWeight: "bold",
                color: "white",
                margin: 0,
                letterSpacing: "-0.05em",
              }}
            >
              {year}
            </p>
          </div>
        </AbsoluteFill>
      </SafeArea>

      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          opacity: creditOpacity,
        }}
      >
        <p
          style={{
            fontSize: 40,
            color: "rgba(255, 255, 255, 0.4)",
            margin: 0,
            letterSpacing: "0.05em",
          }}
        >
          Built using Edit Mind
        </p>
        <p
          style={{
            fontSize: 30,
            color: "rgba(255, 255, 255, 0.25)",
            margin: 0,
            fontFamily: "SF Mono, monospace",
          }}
        >
          github.com/iliashad/edit-mind
        </p>
      </div>
    </AbsoluteFill>
  );
};
