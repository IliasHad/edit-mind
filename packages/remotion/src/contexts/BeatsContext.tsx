import { createContext } from "react";

interface BeatsContextType {
  beatFrames: number[];
}

export const BeatsContext = createContext<BeatsContextType | undefined>(
  undefined,
);
