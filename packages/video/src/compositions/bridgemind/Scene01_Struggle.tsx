import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { OrchestrationDiagram, ContextWindow, TokenFlow, CodeBlock } from "../../components";
import { COLORS, SPRING_CONFIGS } from "../../lib/constants";

const EC = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

export const Scene01_Struggle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ background: COLORS.darkBg }}>
      {/* 0-90f: Isolated code and context loss */}
      <AbsoluteFill style={{ opacity: interpolate(frame, [0, 15, 75, 90], [0, 1, 1, 0], EC) }}>
        <div style={{ padding: 60, display: "flex", gap: 40, height: "100%" }}>
          <div style={{ flex: 1.5 }}>
            <CodeBlock
              code={`// Problem: Context lost here\nfunction executeWorkflow() {\n  const steps = getSteps();\n  // Agent doesn't know about previous steps\n  return steps.map(s => s.run());\n}`}
              language="typescript"
              borderColor={COLORS.error}
            />
          </div>
          <div style={{ flex: 1 }}>
            <ContextWindow
              sections={[
                { label: "Memory", percentage: 0.1, color: COLORS.error, status: "rotting" }
              ]}
              fillLevel={interpolate(frame, [0, 90], [0.8, 0.1], EC)}
            />
          </div>
        </div>
      </AbsoluteFill>

      {/* 90-180f: Chaos/Disconnection */}
      <AbsoluteFill style={{ opacity: interpolate(frame, [90, 105, 165, 180], [0, 1, 1, 0], EC) }}>
        <OrchestrationDiagram />
        <div style={{ position: "absolute", bottom: 100, width: "100%", display: "flex", justifyContent: "center" }}>
           <TokenFlow text="LOST_CONTEXT DISCONNECTED SYNC_ERROR" delay={100} />
        </div>
      </AbsoluteFill>

      {/* 180-266f: Breaking point */}
      {frame > 180 && (
        <AbsoluteFill style={{
          opacity: interpolate(frame, [180, 195, 250, 266], [0, 1, 1, 0], EC),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `radial-gradient(circle at center, ${COLORS.error}15 0%, transparent 60%)`,
        }}>
          <div style={{
            fontSize: 128,
            fontWeight: 900,
            fontFamily: "Inter, sans-serif",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            background: `linear-gradient(135deg, ${COLORS.error}, #ff8a80)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            transform: `scale(${spring({ frame: frame - 185, fps, config: SPRING_CONFIGS.snappy })})`,
            textShadow: "none",
            filter: `drop-shadow(0 0 40px ${COLORS.error}40)`,
          }}>
            Something has to change.
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
