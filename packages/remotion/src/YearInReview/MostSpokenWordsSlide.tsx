import { AbsoluteFill } from "remotion";
import { useMemo } from "react";
import { GradientBackground } from "../components/GradientBackground";
import { KineticText } from "../components/KineticText";
import { SafeArea } from "../components/SafeArea";

interface Props {
  title: string;
  content: string;
}

export const MostSpokenWordsSlide: React.FC<Props> = ({ title, content }) => {

  const words = useMemo(() => {
    return content
      .split(/\n/)
      .map((f) => f.trim().replace(/,/g, ""))
      .filter((f) => f.length > 0);
  }, [content]);

  return (
    <AbsoluteFill >
      <GradientBackground gradientIndex={1} />
      <SafeArea>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <KineticText
            text={title}
            animationType="slide-in"
            startFrame={10}
            style={{ marginBottom: 70, fontSize: 80 }}
          />

          <div
            style={{
              width: "100%",
              maxWidth: 800,
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            {words.map((word, index) => (
              <KineticText
                key={index}
                text={word}
                animationType="fade-in"
                startFrame={30 + index * 10}
                style={{
                  fontSize: 32,
                  fontWeight: 500,
                  color: "rgba(255, 255, 255, 0.95)",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  padding: "12px 20px",
                  borderRadius: 12,
                }}
              />
            ))}
          </div>
        </AbsoluteFill>
      </SafeArea>
    </AbsoluteFill>
  );
};
