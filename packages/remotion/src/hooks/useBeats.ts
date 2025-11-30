import { useContext } from "react";
import { BeatsContext } from "../contexts/BeatsContext";

export const useBeats = () => {
  const context = useContext(BeatsContext);
  if (context === undefined) {
    throw new Error('useBeats must be used within a BeatsProvider');
  }
  return context;
};
