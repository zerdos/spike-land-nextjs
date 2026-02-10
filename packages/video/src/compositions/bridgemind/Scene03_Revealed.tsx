import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BridgeMindLogo, GlassmorphismCard, CodeBlock, ChatBubble, TypingIndicator, MementoCard } from "../../components";
import { SPRING_CONFIGS, COLORS } from "../../lib/constants";

const EC = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

export const Scene03_Revealed: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoSpring = spring({ frame, fps, config: SPRING_CONFIGS.snappy });

  const cards = ["BridgeCode", "BridgeVoice", "BridgeMCP", "BridgeSpace"];

  return (
    <AbsoluteFill style={{ background: COLORS.darkBg }}>
      {/* 0-60f: Logo Orbit */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative",
        opacity: interpolate(frame, [0, 15, 50, 65], [0, 1, 1, 0], EC),
      }}>
        <div style={{ transform: `scale(${logoSpring})`, position: "relative", zIndex: 2 }}>
          <BridgeMindLogo size={120} />
        </div>

        {cards.map((card, i) => {
          const angle = (i * 90 + (frame / fps) * 60) * (Math.PI / 180);
          const r = interpolate(frame, [0, 60], [0, 250], EC);
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;

          return (
            <div key={card} style={{ position: "absolute", transform: `translate(${x}px, ${y}px)` }}>
              <GlassmorphismCard width={140} delay={15 + i * 5} animate={true}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "white", textAlign: "center" }}>{card}</div>
              </GlassmorphismCard>
            </div>
          );
        })}
      </div>

      {/* 60-150f: Split Layout */}
      {frame > 60 && (
        <AbsoluteFill style={{ display: "flex", flexDirection: "row", background: COLORS.darkBg }}>
          <div style={{ flex: 1, padding: 40, opacity: interpolate(frame, [60, 75], [0, 1], EC) }}>
            <CodeBlock code="claude analyze bridgemind.ai" />
          </div>
          <div style={{ flex: 1, padding: 40, display: "flex", flexDirection: "column", gap: 20 }}>
            <ChatBubble message="Analyzing BridgeMind.ai..." isAi={true} delay={70} />
            <TypingIndicator delay={100} />
            <ChatBubble message="This is the missing bridge." isAi={true} delay={130} />
          </div>
        </AbsoluteFill>
      )}

      {/* 150-270f: Large Reveal */}
      {frame > 150 && (
        <AbsoluteFill
          style={{
            background: `radial-gradient(circle at center, ${COLORS.bridgemindCyan}20 0%, transparent 70%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            opacity: interpolate(frame, [150, 165], [0, 1], EC)
          }}
        >
          <div style={{ fontSize: 64, fontWeight: 900, background: `linear-gradient(to right, white, ${COLORS.bridgemindCyan})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            This is the missing bridge.
          </div>
          <div style={{ marginTop: 50, transform: `rotate(5deg) scale(${interpolate(frame, [150, 270], [1, 1.2], EC)})` }}>
            <MementoCard text="PERSISTENT" delay={160} />
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
