import React from 'react';

interface SafeAreaProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const SafeArea: React.FC<SafeAreaProps> = ({ children, style }) => {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        paddingTop: 250,
        paddingBottom: 250,
        marginRight: 20,
        marginLeft: 20,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
