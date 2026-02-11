import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, SPRING_CONFIGS } from "../../lib/constants";

const EC = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

export const Scene07_CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- Phase 1 (0-100f): spike.land logo/text with spring ---
  const logoSpring = spring({
    frame,
    fps,
    config: SPRING_CONFIGS.snappy,
    durationInFrames: 40,
  });

  const glowPulse = Math.sin(frame * 0.06) * 0.3 + 0.7;

  // --- Phase 2 (100-250f): "Try it right now." ---
  const tryOpacity = interpolate(frame, [100, 130], [0, 1], EC);
  const tryY = interpolate(frame, [100, 130], [24, 0], EC);

  // --- Phase 3 (250-350f): "Let's make something great together." ---
  const togetherOpacity = interpolate(frame, [250, 285], [0, 1], EC);
  const togetherY = interpolate(frame, [250, 285], [20, 0], EC);

  // --- Phase 4 (350-450f): End card ---
  const endCardBg = interpolate(frame, [350, 390], [0, 1], EC);

  // Sparkle/ding effect at frame 370
  const sparkleScale = interpolate(frame, [365, 380, 410], [0, 1.2, 0], EC);
  const sparkleOpacity = interpolate(frame, [365, 380, 420], [0, 0.9, 0], EC);

  // Subtle final fade (everything stays mostly visible)
  const endFade = interpolate(frame, [420, 450], [1, 0.85], EC);

  // Radial gradient background that intensifies for end card
  const bgRadialOpacity = interpolate(frame, [0, 350, 400], [0, 0, 0.4], EC);

  return (
    <AbsoluteFill
      style={{
        background: COLORS.darkBg,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* Radial gradient overlay for end card */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, transparent 20%, rgba(20, 20, 40, ${bgRadialOpacity}) 100%)`,
        }}
      />

      {/* Main content container */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: endFade,
        }}
      >
        {/* spike.land logo text */}
        <div
          style={{
            transform: `scale(${logoSpring})`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontSize: 80,
              fontWeight: 800,
              color: COLORS.textPrimary,
              letterSpacing: -2,
              lineHeight: 1,
            }}
          >
            spike.land
          </div>

          {/* Cyan gradient underline */}
          <div
            style={{
              marginTop: 12,
              width: 280,
              height: 4,
              borderRadius: 2,
              background: `linear-gradient(90deg, transparent, ${COLORS.cyan}, transparent)`,
              opacity: glowPulse,
              boxShadow: `0 0 20px ${COLORS.cyan}60`,
            }}
          />
        </div>

        {/* "Try it right now." */}
        <div
          style={{
            marginTop: 48,
            fontSize: 36,
            fontWeight: 500,
            color: COLORS.textPrimary,
            opacity: tryOpacity,
            transform: `translateY(${tryY}px)`,
            letterSpacing: -0.5,
          }}
        >
          Try it right now.
        </div>

        {/* "Let's make something great together." */}
        <div
          style={{
            marginTop: 32,
            fontSize: 30,
            fontWeight: 400,
            color: COLORS.amber,
            opacity: togetherOpacity,
            transform: `translateY(${togetherY}px)`,
            letterSpacing: -0.3,
          }}
        >
          Let&apos;s make something great together.
        </div>
      </AbsoluteFill>

      {/* End card sparkle/ding effect */}
      {frame > 360 && (
        <AbsoluteFill
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 200,
              height: 200,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${COLORS.cyan}40 0%, ${COLORS.cyan}10 40%, transparent 70%)`,
              transform: `scale(${sparkleScale})`,
              opacity: sparkleOpacity,
              top: "32%",
              right: "28%",
            }}
          />
          {/* Secondary smaller sparkle */}
          <div
            style={{
              position: "absolute",
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${COLORS.gold}50 0%, ${COLORS.gold}15 50%, transparent 80%)`,
              transform: `scale(${interpolate(frame, [372, 390, 425], [0, 1, 0], EC)})`,
              opacity: interpolate(frame, [372, 390, 430], [0, 0.7, 0], EC),
              top: "36%",
              right: "24%",
            }}
          />
        </AbsoluteFill>
      )}

      {/* End card radial vignette */}
      {endCardBg > 0 && (
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse at center, transparent 30%, rgba(10, 10, 15, ${endCardBg * 0.5}) 100%)`,
            pointerEvents: "none",
          }}
        />
      )}
    </AbsoluteFill>
  );
};
