import React from 'react';
import { spring, useCurrentFrame, interpolate, useVideoConfig } from 'remotion';
import { FONT_FAMILY } from '../constants/theme';
import { SPRING_CONFIG } from '../constants';

type AnimationType = 'fade-in' | 'slide-in' | 'scale-in' | 'reveal-in';

interface KineticTextProps {
  text: string;
  animationType?: AnimationType;
  startFrame?: number;
  delay?: number;
  style?: React.CSSProperties;
}

const Word: React.FC<{
  word: string;
  frame: number;
  fps: number;
  animationType: AnimationType;
  delay: number;
  style?: React.CSSProperties;
}> = ({ word, frame, fps, animationType, delay, style }) => {
  const progress = spring({
    frame: frame - delay,
    fps,
    config: SPRING_CONFIG.snappy,
  });

  const animationStyle: React.CSSProperties = {};

  switch (animationType) {
    case 'fade-in':
      animationStyle.opacity = progress;
      break;
    case 'slide-in':
      animationStyle.opacity = progress;
      animationStyle.transform = `translateY(${interpolate(progress, [0, 1], [20, 0])}px)`;
      break;
    case 'scale-in':
      animationStyle.transform = `scale(${interpolate(progress, [0, 1], [1.2, 1])})`;
      animationStyle.opacity = progress;
      break;
    case 'reveal-in':
        animationStyle.clipPath = `polygon(0 0, ${interpolate(progress, [0, 1], [0, 100])}% 0, ${interpolate(progress, [0, 1], [0, 100])}% 100%, 0 100%)`;
        break;
    default:
      animationStyle.opacity = progress;
  }

  return (
    <span style={{ display: 'inline-block', ...style, ...animationStyle }}>
      {word}
    </span>
  );
};

export const KineticText: React.FC<KineticTextProps> = ({
  text,
  animationType = 'fade-in',
  startFrame = 0,
  delay = 0,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(' ');

  return (
    <h1
      style={{
        fontFamily: FONT_FAMILY.sans,
        fontSize: 80,
        fontWeight: 'bold',
        color: 'white',
        textAlign: 'center',
        ...style,
      }}
    >
      {words.map((word, i) => (
        <React.Fragment key={i}>
          <Word
            word={word}
            frame={frame}
            fps={fps}
            animationType={animationType}
            delay={startFrame + i * 5 + delay}
            style={style}
          />
          {i < words.length - 1 ? ' ' : ''}
        </React.Fragment>
      ))}
    </h1>
  );
};
