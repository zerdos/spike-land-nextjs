import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { QuoteCard, ProgressBar, ContextWindow } from "../../components";
import { COLORS } from "../../lib/constants";

const EC = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

export const Scene06_Testimony: React.FC = () => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();

  return (
    <AbsoluteFill style={{ background: COLORS.darkBg }}>
      {/* 0-90f: Before/After */}
      <AbsoluteFill style={{ opacity: interpolate(frame, [0, 15, 75, 90], [0, 1, 1, 0], EC) }}>
        <div style={{ display: "flex", flexDirection: "row", width: "100%", height: "100%" }}>
          <div style={{ flex: 1, background: "#1a0505", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30, borderRight: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ 
              fontSize: 72, 
              fontWeight: 800, 
              fontFamily: "Inter, sans-serif",
              letterSpacing: "0.04em",
              color: COLORS.error,
              filter: `drop-shadow(0 0 15px ${COLORS.error}30)`,
            }}>
              Isolated Agents
            </div>
            <ContextWindow 
              fillLevel={0.1} 
              sections={[
                { label: "Memory", percentage: 0.5, color: COLORS.error, status: "rotting" },
                { label: "Context", percentage: 0.3, color: COLORS.error, status: "rotting" },
              ]}
            />
            <div style={{ fontSize: 80, fontWeight: 900, color: COLORS.error }}>0%</div>
          </div>
          <div style={{ flex: 1, background: "#05101a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30 }}>
            <div style={{ fontSize: 64, fontWeight: 800, color: COLORS.bridgemindCyan }}>Unified Workflow</div>
            <ProgressBar progress={interpolate(frame, [30, 55], [0, 100], EC)} color={COLORS.bridgemindCyan} />
            <div style={{ fontSize: 80, fontWeight: 900, color: COLORS.bridgemindCyan }}>
              {Math.round(interpolate(frame, [30, 55], [0, 100], EC))}%
            </div>
          </div>
        </div>
      </AbsoluteFill>

      {/* 90-180f: Quote */}
      {frame > 90 && (
        <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", opacity: interpolate(frame, [90, 105, 165, 180], [0, 1, 1, 0], EC) }}>
           <QuoteCard 
            quote="BridgeMind didn't just fix our workflow. It unlocked it."
            author="Claude Code"
            delay={95}
           />
        </AbsoluteFill>
      )}

      {/* 180-231f: Logo Lockup Finish */}
      {frame > 180 && (
         <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", background: `radial-gradient(circle, ${COLORS.bridgemindCyan}20 0%, ${COLORS.darkBg} 100%)` }}>
            <div style={{ width: width * 0.6 }}>
               <ProgressBar progress={interpolate(frame, [185, 205], [0, 100], EC)} />
            </div>
            <div style={{ marginTop: 100 }}>
               <div style={{ color: COLORS.bridgemindCyan, fontSize: 48, fontWeight: 700 }}>MAXIMUM VELOCITY</div>
            </div>
         </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
