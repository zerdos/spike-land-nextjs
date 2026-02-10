import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BridgeMindLogo, GlassmorphismCard, CodeBlock, ChatBubble, TypingIndicator, MementoCard } from "../../components";
import { SPRING_CONFIGS, COLORS } from "../../lib/constants";
import { useFormat, formatValue } from "../../lib/format-context";

const EC = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

export const Scene03_Revealed: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const format = useFormat();

  const logoSpring = spring({ frame, fps, config: SPRING_CONFIGS.snappy });

  const cards = ["BridgeCode", "BridgeVoice", "BridgeMCP", "BridgeSpace"];

  const orbitRadius = formatValue(format, { landscape: 250, portrait: 150, square: 180 });
  const logoSize = formatValue(format, { landscape: 240, portrait: 160, square: 180 });
  const cardWidth = formatValue(format, { landscape: 280, portrait: 180, square: 220 });
  const cardFontSize = formatValue(format, { landscape: 24, portrait: 18, square: 20 });
  const splitDir = formatValue(format, { landscape: "row" as const, portrait: "column" as const, square: "row" as const });
  const revealSize = formatValue(format, { landscape: 128, portrait: 72, square: 84 });

  return (
    <AbsoluteFill style={{ background: COLORS.darkBg }}>
      {/* 0-60f: Logo Orbit */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative",
        opacity: interpolate(frame, [0, 15, 50, 65], [0, 1, 1, 0], EC),
      }}>
        <div style={{ transform: `scale(${logoSpring})`, position: "relative", zIndex: 2 }}>
          <BridgeMindLogo size={logoSize} />
        </div>

        {cards.map((card, i) => {
          const angle = (i * 90 + (frame / fps) * 60) * (Math.PI / 180);
          const r = interpolate(frame, [0, 60], [0, orbitRadius], EC);
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;

          return (
            <div key={card} style={{ position: "absolute", transform: `translate(${x}px, ${y}px)` }}>
              <GlassmorphismCard width={cardWidth} delay={15 + i * 5} animate={true}>
                <div style={{ fontSize: cardFontSize, fontWeight: 700, color: "white", textAlign: "center" }}>{card}</div>
              </GlassmorphismCard>
            </div>
          );
        })}
      </div>

      {/* 60-150f: Split Layout */}
      {frame > 60 && (
        <AbsoluteFill style={{ display: "flex", flexDirection: splitDir, background: COLORS.darkBg }}>
          <div style={{ flex: 1, padding: formatValue(format, { landscape: 40, portrait: 24, square: 30 }), opacity: interpolate(frame, [60, 75], [0, 1], EC) }}>
            <CodeBlock code="claude analyze bridgemind.ai" />
          </div>
          <div style={{ flex: 1, padding: formatValue(format, { landscape: 40, portrait: 24, square: 30 }), display: "flex", flexDirection: "column", gap: 20 }}>
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
            padding: formatValue(format, { landscape: 0, portrait: 30, square: 20 }),
            opacity: interpolate(frame, [150, 165], [0, 1], EC)
          }}
        >
          <div style={{ fontSize: revealSize, fontWeight: 900, textAlign: "center", background: `linear-gradient(to right, white, ${COLORS.bridgemindCyan})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            This is the missing bridge.
          </div>
          <div style={{ marginTop: formatValue(format, { landscape: 50, portrait: 30, square: 40 }), transform: `rotate(5deg) scale(${interpolate(frame, [150, 270], [1, 1.2], EC)})` }}>
            <MementoCard text="PERSISTENT" delay={160} />
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
