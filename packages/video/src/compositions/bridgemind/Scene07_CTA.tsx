import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BridgeMindLogo, GlassmorphismCard, LogoLockup, AuroraBorealis } from "../../components";
import { SPRING_CONFIGS, COLORS } from "../../lib/constants";

const EC = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

export const Scene07_CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoSpring = spring({ frame, fps, config: SPRING_CONFIGS.snappy });

  return (
    <AbsoluteFill style={{ background: COLORS.darkBg }}>
      <AuroraBorealis intensity={0.8} />

      {/* 0-70f: Main Logo + Tagline (holds 40-70 = 30f) */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div style={{ transform: `scale(${logoSpring})` }}>
           <BridgeMindLogo size={400} />
        </div>

        <div
          style={{
            marginTop: 20,
            fontSize: 64,
            fontWeight: 500,
            color: COLORS.textSecondary,
            opacity: interpolate(frame, [20, 40], [0, 1], EC),
            transform: `translateY(${interpolate(frame, [20, 40], [20, 0], EC)}px)`
          }}
        >
          Ship software at the speed of thought.
        </div>
      </div>

      {/* 70-135f: Feature Grid (last card at ~99, holds 99-135 = 36f) */}
      {frame > 70 && (
        <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 100, background: "rgba(0,0,0,0.4)" }}>
           <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30 }}>
             {["BridgeCode", "BridgeVoice", "BridgeMCP", "BridgeSpace"].map((feat, i) => (
               <GlassmorphismCard key={feat} delay={78 + i * 8} width={600}>
                 <div style={{ fontSize: 48, fontWeight: 700, color: COLORS.bridgemindCyan }}>{feat}</div>
                 <div style={{ fontSize: 28, color: COLORS.textSecondary, marginTop: 8 }}>The ultimate agent {feat.toLowerCase()} solution.</div>
               </GlassmorphismCard>
             ))}
           </div>
        </AbsoluteFill>
      )}

      {/* 135-180f: Final URL (fades in by 148, holds 148-180 = 32f) */}
      {frame > 135 && (
        <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", background: COLORS.darkBg }}>
          <div style={{ transform: `scale(${interpolate(frame, [135, 148], [0.8, 1], EC)})`, opacity: interpolate(frame, [135, 148], [0, 1], EC) }}>
            <div
               style={{
                 fontSize: 160,
                 fontWeight: 900,
                 padding: "20px 60px",
                 borderRadius: 40,
                 background: "rgba(34, 211, 238, 0.1)",
                 border: `4px solid ${COLORS.bridgemindCyan}`,
                 color: "white",
                 boxShadow: `0 0 50px ${COLORS.bridgemindCyan}40`,
               }}
            >
              bridgemind.ai
            </div>
          </div>
          <div style={{ position: "absolute", bottom: 100 }}>
             <LogoLockup size={120} delay={145} />
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
