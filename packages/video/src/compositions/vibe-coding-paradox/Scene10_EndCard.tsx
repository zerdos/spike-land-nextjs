import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { COLORS, TYPOGRAPHY } from "../../lib/constants";
import { TakeawayCards } from "../../components/ui/TakeawayCards";
import { SpikeLandLogo } from "../../components/branding/SpikeLandLogo";
import { GradientMesh } from "../../components/branding/GradientMesh";
import { KineticText } from "../../components/ui/KineticText";

export const Scene10_EndCard: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.darkBg,
        fontFamily: TYPOGRAPHY.fontFamily.sans,
      }}
    >
      {/* Part 1: Takeaway cards (0-675, 22.5s) */}
      <Sequence from={0} durationInFrames={675}>
        <AbsoluteFill
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 60,
          }}
        >
          <TakeawayCards delay={10} />
        </AbsoluteFill>
      </Sequence>

      {/* Part 2: Logo with gradient mesh background (675-1080, 13.5s) */}
      <Sequence from={675} durationInFrames={405}>
        <AbsoluteFill>
          <GradientMesh animationSpeed={0.02} opacity={0.8} />
          <AbsoluteFill
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <SpikeLandLogo size={180} delay={685} />
          </AbsoluteFill>
        </AbsoluteFill>
      </Sequence>

      {/* Part 3: Call to action text (1080-1350, 9s) */}
      <Sequence from={1080} durationInFrames={270}>
        <AbsoluteFill>
          <GradientMesh animationSpeed={0.02} opacity={0.6} />
          <AbsoluteFill
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 60,
            }}
          >
            <SpikeLandLogo size={140} delay={0} animate={false} />
            <KineticText
              text="spike.land — Read the full article"
              fontSize={36}
              color={COLORS.textSecondary}
              type="slide"
              delay={1100}
            />
          </AbsoluteFill>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
