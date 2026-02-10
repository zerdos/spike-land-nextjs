import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { OrchestrationDiagram, ContextWindow, TokenFlow, CodeBlock } from "../../components";
import { GlitchTransition } from "../../components/effects/GlitchTransition";
import { COLORS } from "../../lib/constants";

export const Scene01_Struggle: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: COLORS.darkBg }}>
      {/* 0-90f: Isolated code and context loss */}
      <AbsoluteFill style={{ opacity: interpolate(frame, [0, 15, 75, 90], [0, 1, 1, 0]) }}>
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
              fillLevel={interpolate(frame, [0, 90], [0.8, 0.1])} 
            />
          </div>
        </div>
      </AbsoluteFill>

      {/* 90-180f: Chaos/Disconnection */}
      <AbsoluteFill style={{ opacity: interpolate(frame, [90, 105, 165, 180], [0, 1, 1, 0]) }}>
        <OrchestrationDiagram />
        <div style={{ position: "absolute", bottom: 100, width: "100%", display: "flex", justifyContent: "center" }}>
           <TokenFlow text="LOST_CONTEXT DISCONNECTED SYNC_ERROR" delay={100} />
        </div>
        
        {frame > 160 && (
          <GlitchTransition startFrame={160} duration={20} intensity={2}>
            <AbsoluteFill style={{ background: "rgba(255,0,0,0.1)" }} />
          </GlitchTransition>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
