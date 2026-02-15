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
import { SpikeLandLogo } from "../../components/branding/SpikeLandLogo";
import { GradientMesh } from "../../components/branding/GradientMesh";
import { KineticText } from "../../components/ui/KineticText";

export const Scene08_EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.darkBg,
        fontFamily: TYPOGRAPHY.fontFamily.sans,
      }}
    >
      {/* Part 1: Logo with gradient mesh (0-300) */}
      <Sequence from={0} durationInFrames={300}>
        <AbsoluteFill>
          <GradientMesh animationSpeed={0.02} opacity={0.8} />
          <AbsoluteFill
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <SpikeLandLogo size={200} delay={10} />
          </AbsoluteFill>
        </AbsoluteFill>
      </Sequence>

      {/* Part 2: Tagline (300-600) */}
      <Sequence from={300} durationInFrames={300}>
        <AbsoluteFill>
          <GradientMesh animationSpeed={0.02} opacity={0.6} />
          <AbsoluteFill
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 30,
            }}
          >
            <SpikeLandLogo size={120} delay={0} animate={false} />
            <KineticText
              text="Every URL is an app waiting to be born"
              fontSize={48}
              color={COLORS.cyan}
              type="reveal"
              delay={320}
            />
          </AbsoluteFill>
        </AbsoluteFill>
      </Sequence>

      {/* Part 3: Credits and CTA (600-900) */}
      <Sequence from={600} durationInFrames={300}>
        <AbsoluteFill>
          <GradientMesh animationSpeed={0.015} opacity={0.5} />
          <AbsoluteFill
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 40,
            }}
          >
            <SpikeLandLogo size={100} delay={0} animate={false} />
            <div
              style={{
                fontSize: TYPOGRAPHY.fontSize["2xl"],
                fontWeight: 600,
                color: COLORS.textSecondary,
                textAlign: "center",
                lineHeight: 1.8,
                opacity: spring({
                  frame: frame - 620,
                  fps,
                  config: SPRING_CONFIGS.smooth,
                }),
              }}
            >
              Open source on GitHub
            </div>
            <div
              style={{
                fontSize: TYPOGRAPHY.fontSize.xl,
                color: COLORS.textMuted,
                textAlign: "center",
                opacity: interpolate(frame, [680, 710], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
              }}
            >
              Built for the BridgeMind Vibeathon 2026
            </div>
          </AbsoluteFill>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
