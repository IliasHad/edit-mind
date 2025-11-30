import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import React from 'react';
import { GRADIENTS } from '../constants/theme';

interface GradientBackgroundProps {
  gradientIndex: number;
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({ gradientIndex }) => {
  const frame = useCurrentFrame();
  const rotation = interpolate(frame, [0, 300], [0, 360], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const [color1, color2] = GRADIENTS[gradientIndex % GRADIENTS.length];

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${rotation}deg, ${color1}, ${color2})`,
      }}
    />
  );
};
