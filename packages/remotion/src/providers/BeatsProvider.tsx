import React, { useEffect, useState } from "react";
import { staticFile, useVideoConfig } from "remotion";
import { BeatsContext } from "../contexts/BeatsContext";

interface BeatsData {
  bpm: number;
  beats: number[];
  confidence: number;
}

export const BeatsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { fps } = useVideoConfig();
  const [beatFrames, setBeatFrames] = useState<number[]>([]);

  useEffect(() => {
    const fetchBeats = async () => {
      const url = staticFile("beats.json");
      const response = await fetch(url);
      const data: BeatsData = await response.json();
      const frames = data.beats.map((beat) => Math.round(beat * fps));
      setBeatFrames(frames);
    };

    fetchBeats();
  }, [fps]);

  return (
    <BeatsContext.Provider value={{ beatFrames }}>
      {children}
    </BeatsContext.Provider>
  );
};
