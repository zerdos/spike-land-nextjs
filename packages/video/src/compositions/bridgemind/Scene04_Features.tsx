import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { TaskBoard, OrchestrationDiagram, ContextWindow, TokenFlow } from "../../components";
import { COLORS } from "../../lib/constants";
import { useFormat, formatValue } from "../../lib/format-context";

const EC = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

export const Scene04_Features: React.FC = () => {
  const frame = useCurrentFrame();
  const format = useFormat();

  const labelSize = formatValue(format, { landscape: 64, portrait: 42, square: 48 });
  const heroSize = formatValue(format, { landscape: 96, portrait: 56, square: 64 });

  return (
    <AbsoluteFill style={{ background: COLORS.darkBg }}>
      {/* 0-90f: Task Board */}
      <AbsoluteFill style={{ opacity: interpolate(frame, [0, 15, 75, 90], [0, 1, 1, 0], EC) }}>
        <TaskBoard />
      </AbsoluteFill>

      {/* 90-180f: Context Restoration */}
      {frame >= 90 && frame < 180 && (
        <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: formatValue(format, { landscape: 40, portrait: 24, square: 30 }), padding: formatValue(format, { landscape: 0, portrait: 20, square: 10 }) }}>
          <ContextWindow
            sections={[
              { label: "Architecture", percentage: 0.4, color: COLORS.bridgemindCyan, status: "fresh" },
              { label: "UI Patterns", percentage: 0.3, color: COLORS.bridgemindPink, status: "fresh" },
              { label: "History", percentage: 0.25, color: COLORS.bridgemindSlate, status: "cached" }
            ]}
            fillLevel={interpolate(frame, [100, 145], [0.3, 0.95], EC)}
          />
          <div style={{
            color: COLORS.bridgemindCyan,
            fontWeight: 800,
            fontSize: labelSize,
            fontFamily: "Inter, sans-serif",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            textAlign: "center",
            filter: `drop-shadow(0 0 20px ${COLORS.bridgemindCyan}60)`,
          }}>
            CONTEXT RESTORED
          </div>
        </AbsoluteFill>
      )}

      {/* 180-270f: Orchestration */}
      <AbsoluteFill style={{ opacity: interpolate(frame, [180, 195, 255, 270], [0, 1, 1, 0], EC) }}>
        <OrchestrationDiagram />
        <div style={{ position: "absolute", bottom: formatValue(format, { landscape: 100, portrait: 200, square: 80 }), width: "100%", display: "flex", justifyContent: "center" }}>
          <TokenFlow text="SYNC_ASSETS LOAD_SCHEMA CLONE_PATTERNS" delay={190} />
        </div>
      </AbsoluteFill>

      {/* 270-347f: Logo Reveal */}
      {frame >= 270 && (
        <AbsoluteFill style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: formatValue(format, { landscape: 40, portrait: 30, square: 30 }),
          opacity: interpolate(frame, [270, 285], [0, 1], EC),
          transform: `scale(${interpolate(frame, [270, 285], [0.9, 1], EC)})`,
        }}>
          <div style={{
            color: "white", fontSize: heroSize, fontWeight: 900,
            textAlign: "center",
            background: `linear-gradient(to right, ${COLORS.bridgemindCyan}, ${COLORS.bridgemindPink})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            BRIDGEMIND RESTORES FLOW
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
