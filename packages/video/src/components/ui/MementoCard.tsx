import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, SPRING_CONFIGS } from "../../lib/constants";

type MementoCardProps = {
  text: string;
  style?: "tattoo" | "polaroid";
  delay?: number;
  rotation?: number;
};

export function MementoCard({
  text,
  style = "polaroid",
  delay = 0,
  rotation = 0,
}: MementoCardProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: frame - delay,
    fps,
    config: SPRING_CONFIGS.bouncy,
  });

  if (style === "tattoo") {
    return (
      <div
        style={{
          transform: `scale(${entrance}) rotate(${rotation}deg)`,
          opacity: entrance,
          padding: "20px",
          color: COLORS.cyan,
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 24,
          fontWeight: 700,
          textShadow: `0 0 10px ${COLORS.cyan}80`,
          border: `2px solid ${COLORS.cyan}40`,
          borderRadius: "4px",
          backgroundColor: "rgba(139, 92, 246, 0.05)",
          maxWidth: "400px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        {text}
      </div>
    );
  }

  return (
    <div
      style={{
        transform: `scale(${entrance}) rotate(${rotation}deg)`,
        opacity: entrance,
        width: "300px",
        height: "360px",
        backgroundColor: "#f0f0f0",
        padding: "15px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.5), 5px 5px 15px rgba(0,0,0,0.2)",
        border: "1px solid #ddd",
      }}
    >
      <div
        style={{
          flex: 1,
          backgroundColor: "#111",
          borderRadius: "2px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          textAlign: "center",
          color: "white",
          fontFamily: "Inter, sans-serif",
          fontSize: 18,
          lineHeight: "1.4",
        }}
      >
        {text}
      </div>
      <div
        style={{
          height: "60px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "cursive",
          color: "#444",
          fontSize: 16,
        }}
      >
        MEMENTO
      </div>
    </div>
  );
}
