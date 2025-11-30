import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import React from 'react';
import { GRADIENTS } from '../constants/theme';

interface TransitionProps {
  children: React.ReactNode;
  durationInFrames: number;
}

export const Transition: React.FC<TransitionProps> = ({ children, durationInFrames }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [durationInFrames - 15, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  if (progress === 0) {
    return <AbsoluteFill>{children}</AbsoluteFill>;
  }

  const [color1, color2] = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];

  return (
    <AbsoluteFill>
      <AbsoluteFill>{children}</AbsoluteFill>
      <AbsoluteFill
        style={{
          transform: `translateX(${interpolate(progress, [0, 1], [-100, 0])}%)`,
          background: `linear-gradient(to right, ${color1}, ${color2})`,
        }}
      />
    </AbsoluteFill>
  );
};
