import { useCurrentFrame, spring, interpolate, useVideoConfig } from "remotion";

interface BeatSyncOptions {
  beatFrames: number[];
  animationType: "pulse" | "jump";
  config?: {
    stiffness?: number;
    damping?: number;
    mass?: number;
  };
}

export const useBeatSync = ({
  beatFrames,
  animationType,
  config = {
    stiffness: 70,
    damping: 35,
    mass: 1,
  },
}: BeatSyncOptions) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  let lastBeat = 0;
  for (const beat of beatFrames) {
    if (frame >= beat) {
      lastBeat = beat;
    }
  }

  const progress = spring({
    frame: frame - lastBeat,
    fps,
    config,
  });

  const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
  const smoothProgress = easeOut(progress);

  switch (animationType) {
    case "pulse":
      return interpolate(smoothProgress, [0, 0.3, 1], [1, 1.04, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    case "jump":
      return interpolate(smoothProgress, [0, 0.3, 1], [0, -6, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    default:
      return 1;
  }
};
