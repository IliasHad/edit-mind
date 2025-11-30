import { AbsoluteFill } from "remotion";
import { useMemo } from "react";
import { GradientBackground } from "../components/GradientBackground";
import { KineticText } from "../components/KineticText";
import { SafeArea } from "../components/SafeArea";

interface Props {
  title: string;
  content: string;
}

export const FunFactsSlide: React.FC<Props> = ({ title, content }) => {


  const facts = useMemo(() => {
    return content
      .split(/•|\n/)
      .map((f) => f.trim())
      .filter((f) => f.length > 0);
  }, [content]);

  return (
    <AbsoluteFill >
      <GradientBackground gradientIndex={2} />
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
              gap: 24,
            }}
          >
            {facts.map((fact, index) => (
              <KineticText
                key={index}
                text={`• ${fact}`}
                animationType="reveal-in"
                startFrame={30}
                style={{
                  fontSize: 48,
                  fontWeight: 500,
                  color: "rgba(255, 255, 255, 0.95)",
                  textAlign: "left",
                  lineHeight: 1.4,
                }}
              />
            ))}
          </div>
        </AbsoluteFill>
      </SafeArea>
    </AbsoluteFill>
  );
};
