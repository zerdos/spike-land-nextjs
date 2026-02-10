import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { TaskBoard, OrchestrationDiagram, ContextWindow, TokenFlow } from "../../components";
import { GlitchTransition } from "../../components/effects/GlitchTransition";
import { COLORS } from "../../lib/constants";

export const Scene04_Features: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: COLORS.darkBg }}>
      {/* 0-90f: Task Board */}
      <AbsoluteFill style={{ opacity: interpolate(frame, [0, 15, 75, 90], [0, 1, 1, 0]) }}>
        <TaskBoard />
      </AbsoluteFill>

      {/* 90-180f: Context Restoration */}
      {frame >= 90 && frame < 180 && (
        <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 40 }}>
          <ContextWindow 
            sections={[
              { label: "Architecture", percentage: 0.4, color: COLORS.bridgemindCyan, status: "fresh" },
              { label: "UI Patterns", percentage: 0.3, color: COLORS.bridgemindPink, status: "fresh" },
              { label: "History", percentage: 0.25, color: COLORS.bridgemindSlate, status: "cached" }
            ]}
            fillLevel={interpolate(frame, [100, 170], [0.3, 0.95])} 
          />
          <div style={{ color: COLORS.bridgemindCyan, fontWeight: 800, fontSize: 32 }}>CONTEXT RESTORED</div>
          {frame > 165 && (
            <GlitchTransition startFrame={165} duration={15} intensity={1}>
              <AbsoluteFill style={{ background: "rgba(255,255,255,0.05)" }} />
            </GlitchTransition>
          )}
        </AbsoluteFill>
      )}

      {/* 180-270f: Orchestration */}
      <AbsoluteFill style={{ opacity: interpolate(frame, [180, 195, 255, 270], [0, 1, 1, 0]) }}>
        <OrchestrationDiagram />
        <div style={{ position: "absolute", bottom: 100, width: "100%", display: "flex", justifyContent: "center" }}>
          <TokenFlow text="SYNC_ASSETS LOAD_SCHEMA CLONE_PATTERNS" delay={190} />
        </div>
      </AbsoluteFill>

      {/* 270-360f: Logo Reveal Placeholder */}
      {frame >= 270 && (
        <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
           <div style={{ color: "white", fontSize: 48, fontWeight: 900 }}>BRIDGEMIND RESTORES FLOW</div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
