import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, SPRING_CONFIGS } from "../../lib/constants";

type BridgeMindLogoProps = {
  size?: number;
  delay?: number;
  animate?: boolean;
};

export const BridgeMindLogo: React.FC<BridgeMindLogoProps> = ({
  size = 120,
  delay = 0,
  animate = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entryProgress = animate
    ? spring({
        frame: frame - delay,
        fps,
        config: SPRING_CONFIGS.snappy,
      })
    : 1;

  const opacity = interpolate(entryProgress, [0, 1], [0, 1]);
  const scale = interpolate(entryProgress, [0, 1], [0.8, 1]);

  const glowPulse = Math.sin(((frame - delay) / fps) * Math.PI * 2) * 0.2 + 0.8;

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        filter: `drop-shadow(0 0 ${15 * glowPulse}px ${COLORS.bridgemindCyan}40)`,
      }}
    >
      <div
        style={{
          fontSize: size,
          fontWeight: 800,
          fontFamily: "Inter, sans-serif",
          letterSpacing: "-0.04em",
          background: `linear-gradient(135deg, ${COLORS.bridgemindCyan}, ${COLORS.bridgemindPink})`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        BridgeMind
      </div>
      <div
        style={{
          fontSize: size * 0.25,
          fontWeight: 500,
          color: COLORS.textSecondary,
          letterSpacing: "0.2em",
          marginTop: -size * 0.1,
          textTransform: "uppercase",
        }}
      >
        dot AI
      </div>
    </div>
  );
};
