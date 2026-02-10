import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BridgeMindLogo, GlassmorphismCard, LogoLockup, AuroraBorealis } from "../../components";
import { SPRING_CONFIGS, COLORS } from "../../lib/constants";

export const Scene07_CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width: _width, height: _height } = useVideoConfig();

  const logoSpring = spring({ frame, fps, config: SPRING_CONFIGS.snappy });

  return (
    <AbsoluteFill style={{ background: COLORS.darkBg }}>
      <AuroraBorealis intensity={0.8} />
      
      {/* 0-60f: Main Logo */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div style={{ transform: `scale(${logoSpring})` }}>
           <BridgeMindLogo size={200} />
        </div>
        
        <div 
          style={{ 
            marginTop: 20, 
            fontSize: 32, 
            fontWeight: 500, 
            color: COLORS.textSecondary,
            opacity: interpolate(frame, [30, 60], [0, 1]),
            transform: `translateY(${interpolate(frame, [30, 60], [20, 0], { extrapolateRight: "clamp" })}px)`
          }}
        >
          Ship software at the speed of thought.
        </div>
      </div>

      {/* 60-150f: Feature Grid */}
      {frame > 60 && (
        <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 100, background: "rgba(0,0,0,0.4)" }}>
           <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30 }}>
             {["BridgeCode", "BridgeVoice", "BridgeMCP", "BridgeSpace"].map((feat, i) => (
               <GlassmorphismCard key={feat} delay={70 + i * 10} width={300}>
                 <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.bridgemindCyan }}>{feat}</div>
                 <div style={{ fontSize: 14, color: COLORS.textSecondary, marginTop: 8 }}>The ultimate agent {feat.toLowerCase()} solution.</div>
               </GlassmorphismCard>
             ))}
           </div>
        </AbsoluteFill>
      )}

      {/* 150-285f: Final URL */}
      {frame > 150 && (
        <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", background: COLORS.darkBg }}>
          <div style={{ transform: `scale(${interpolate(frame, [150, 165], [0.8, 1], { extrapolateRight: "clamp" })})`, opacity: interpolate(frame, [150, 165], [0, 1]) }}>
            <div 
               style={{ 
                 fontSize: 80, 
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
             <LogoLockup size={60} delay={180} />
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
