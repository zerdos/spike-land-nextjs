import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, SPRING_CONFIGS } from "../../lib/constants";

type SplitScreenRevealProps = {
  leftContent: React.ReactNode;
  rightContent: React.ReactNode;
  /** Animated split point 0-1 (default animates automatically) */
  splitPoint?: number;
  revealDirection?: "left-to-right" | "right-to-left";
  delay?: number;
};

export function SplitScreenReveal({
  leftContent,
  rightContent,
  splitPoint,
  revealDirection = "left-to-right",
  delay = 0,
}: SplitScreenRevealProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const animatedSplit =
    splitPoint ??
    spring({
      frame: frame - delay,
      fps,
      config: SPRING_CONFIGS.smooth,
      durationInFrames: 45,
    });

  const effectiveSplit =
    revealDirection === "right-to-left" ? 1 - animatedSplit : animatedSplit;

  const splitPercent = interpolate(effectiveSplit, [0, 1], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const glowOpacity = interpolate(
    Math.abs(animatedSplit - 0.5),
    [0, 0.5],
    [1, 0.2],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ background: COLORS.darkBg }}>
      {/* Left side */}
      <AbsoluteFill
        style={{
          clipPath: `inset(0 ${100 - splitPercent}% 0 0)`,
        }}
      >
        {leftContent}
      </AbsoluteFill>

      {/* Right side */}
      <AbsoluteFill
        style={{
          clipPath: `inset(0 0 0 ${splitPercent}%)`,
        }}
      >
        {rightContent}
      </AbsoluteFill>

      {/* Divider line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: `${splitPercent}%`,
          width: 3,
          background: COLORS.cyan,
          boxShadow: `0 0 ${12 * glowOpacity}px ${COLORS.cyan}, 0 0 ${24 * glowOpacity}px ${COLORS.cyan}60`,
          transform: "translateX(-50%)",
          zIndex: 10,
        }}
      />
    </AbsoluteFill>
  );
}
