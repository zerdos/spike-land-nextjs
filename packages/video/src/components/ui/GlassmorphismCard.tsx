import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, SPRING_CONFIGS } from "../../lib/constants";

type GlassmorphismCardProps = {
  children: React.ReactNode;
  width?: number | string;
  height?: number | string;
  delay?: number;
  color?: string;
  animate?: boolean;
};

export const GlassmorphismCard: React.FC<GlassmorphismCardProps> = ({
  children,
  width = 400,
  height = "auto",
  delay = 0,
  color = COLORS.bridgemindCyan,
  animate = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = animate
    ? spring({
        frame: frame - delay,
        fps,
        config: SPRING_CONFIGS.snappy,
      })
    : 1;

  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const y = interpolate(progress, [0, 1], [20, 0]);

  return (
    <div
      style={{
        width,
        height,
        opacity,
        transform: `translateY(${y}px)`,
        background: "rgba(255, 255, 255, 0.05)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRadius: 24,
        border: `1px solid ${color}40`,
        padding: 32,
        boxShadow: `0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 0 0 1px rgba(255, 255, 255, 0.05)`,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Subtle background glow */}
      <div
        style={{
          position: "absolute",
          top: -100,
          right: -100,
          width: 200,
          height: 200,
          background: `${color}15`,
          filter: "blur(60px)",
          borderRadius: "50%",
        }}
      />
      {children}
    </div>
  );
};
