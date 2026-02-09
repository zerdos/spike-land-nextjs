import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, SPRING_CONFIGS } from "../../lib/constants";

type ContextSection = {
  label: string;
  percentage: number;
  color: string;
  status: "cached" | "fresh" | "rotting";
};

type ContextWindowProps = {
  sections: ContextSection[];
  fillLevel?: number; // 0 to 1
  delay?: number;
};

export function ContextWindow({
  sections,
  fillLevel = 1,
  delay = 0,
}: ContextWindowProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: frame - delay,
    fps,
    config: SPRING_CONFIGS.snappy,
  });

  return (
    <div
      style={{
        transform: `scaleY(${entrance})`,
        transformOrigin: "bottom",
        width: "400px",
        height: "600px",
        backgroundColor: COLORS.darkBg,
        border: `2px solid ${COLORS.darkBorder}`,
        borderRadius: "12px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
      }}
    >
      <div
        style={{
          height: "40px",
          backgroundColor: COLORS.darkCard,
          borderBottom: `1px solid ${COLORS.darkBorder}`,
          display: "flex",
          alignItems: "center",
          padding: "0 15px",
          gap: "8px",
        }}
      >
        <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#ff5f56" }} />
        <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#ffbd2e" }} />
        <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#27c93f" }} />
        <div style={{ marginLeft: "10px", color: COLORS.textMuted, fontSize: 12, fontFamily: "monospace" }}>CONTEXT_WINDOW.exe</div>
      </div>
      
      <div style={{ flex: 1, display: "flex", flexDirection: "column-reverse", padding: "10px" }}>
        {sections.map((section, index) => {
          const sectionHeight = `${section.percentage * 100 * fillLevel}%`;
          const sectionEntrance = spring({
            frame: frame - delay - index * 10 - 15,
            fps,
            config: SPRING_CONFIGS.snappy,
          });

          return (
            <div
              key={section.label}
              style={{
                height: `calc(${sectionHeight} * ${sectionEntrance})`,
                backgroundColor: section.color,
                margin: "2px 0",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                overflow: "hidden",
                border: section.status === "cached" ? "1px dashed rgba(255,255,255,0.3)" : "none",
              }}
            >
              {sectionEntrance > 0.5 && (
                <div
                  style={{
                    color: "white",
                    fontSize: 14,
                    fontWeight: "bold",
                    fontFamily: "JetBrains Mono, monospace",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    textShadow: "0 2px 4px rgba(0,0,0,0.5)",
                  }}
                >
                  {section.label}
                </div>
              )}
              {section.status === "cached" && (
                <div style={{ position: "absolute", top: 5, right: 10, fontSize: 10, color: "white", opacity: 0.6 }}>CACHED ❄️</div>
              )}
              {section.status === "rotting" && (
                <div style={{ 
                    position: "absolute", 
                    width: "100%", 
                    height: "100%", 
                    background: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,0,0,0.1) 10px, rgba(255,0,0,0.1) 20px)" 
                }} />
              )}
            </div>
          );
        })}
      </div>

      <div
        style={{
          height: "60px",
          backgroundColor: COLORS.darkCard,
          borderTop: `1px solid ${COLORS.darkBorder}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
        }}
      >
        <div style={{ color: COLORS.textSecondary, fontSize: 14, fontFamily: "monospace" }}>Usage: {Math.round(fillLevel * 100)}%</div>
        <div 
            style={{ 
                width: "150px", 
                height: "8px", 
                backgroundColor: "rgba(255,255,255,0.1)", 
                borderRadius: "4px",
                overflow: "hidden"
            }}
        >
            <div style={{ width: `${fillLevel * 100}%`, height: "100%", backgroundColor: fillLevel > 0.8 ? COLORS.error : COLORS.cyan }} />
        </div>
      </div>
    </div>
  );
}
