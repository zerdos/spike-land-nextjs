import React from "react";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, SPRING_CONFIGS, TYPOGRAPHY } from "../../lib/constants";
import { fadeIn } from "../../lib/animations";
import { KineticText } from "../../components/ui/KineticText";
import { GlitchText } from "../../components/ui/GlitchText";
import { GradientMesh } from "../../components/branding/GradientMesh";
import { SpikeLandLogo } from "../../components/branding/SpikeLandLogo";

export const Scene01_Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Part 1: Countdown from 30:00 (1800s) to 0:10 (10s)
  const countdownProgress = interpolate(frame, [0, 280], [1800, 10], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const totalSeconds = Math.round(countdownProgress);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const timerDisplay = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const subtitleOpacity = fadeIn(frame, fps, 0.8, 30);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.darkBg,
        fontFamily: TYPOGRAPHY.fontFamily.sans,
      }}
    >
      {/* Part 1: Countdown timer (0-300) */}
      <Sequence from={0} durationInFrames={300}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 30,
          }}
        >
          <div
            style={{
              fontSize: 120,
              fontWeight: 700,
              fontFamily: TYPOGRAPHY.fontFamily.mono,
              color: COLORS.cyan,
              letterSpacing: "0.05em",
              textShadow: `0 0 40px ${COLORS.cyan}60, 0 0 80px ${COLORS.cyan}30`,
            }}
          >
            {timerDisplay}
          </div>
          <div
            style={{
              fontSize: 32,
              color: COLORS.textSecondary,
              opacity: subtitleOpacity,
              fontWeight: 500,
            }}
          >
            Your build time
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Part 2: Bold statements (300-600) */}
      <Sequence from={300} durationInFrames={300}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 50,
          }}
        >
          <GlitchText
            text="This is not a demo"
            fontSize={64}
            color={COLORS.textPrimary}
            glitchIntensity={4}
            isGlitching={frame > 310 && frame < 500}
            delay={310}
          />
          <GlitchText
            text="This is not a prototype"
            fontSize={64}
            color={COLORS.textPrimary}
            glitchIntensity={4}
            isGlitching={frame > 360 && frame < 520}
            delay={360}
          />
          <div style={{ marginTop: 20 }}>
            <KineticText
              text="This is spike.land"
              fontSize={80}
              color={COLORS.cyan}
              type="scale"
              delay={430}
            />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Part 3: Logo + tagline (600-900) */}
      <Sequence from={600} durationInFrames={300}>
        <AbsoluteFill>
          <GradientMesh
            animationSpeed={0.015}
            opacity={interpolate(frame, [600, 660], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
          />
          <AbsoluteFill
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 40,
            }}
          >
            <SpikeLandLogo size={140} delay={620} />
            <KineticText
              text="No More 404s"
              fontSize={72}
              color={COLORS.textPrimary}
              type="scale"
              delay={670}
            />
            <div
              style={{
                fontSize: 28,
                color: COLORS.textSecondary,
                fontWeight: 500,
                opacity: spring({
                  frame: frame - 720,
                  fps,
                  config: SPRING_CONFIGS.smooth,
                }),
              }}
            >
              Vibeathon 2026
            </div>
          </AbsoluteFill>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
