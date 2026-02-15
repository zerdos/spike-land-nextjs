import React from "react";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, TYPOGRAPHY } from "../../lib/constants";
import { GlitchText } from "../../components/ui/GlitchText";
import { KineticText } from "../../components/ui/KineticText";
import { GradientMesh } from "../../components/branding/GradientMesh";

export const Scene02_Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps: _fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.darkBg,
        fontFamily: TYPOGRAPHY.fontFamily.sans,
      }}
    >
      {/* Part 1: Stacked 404 error messages with glitch (0-350) */}
      <Sequence from={0} durationInFrames={350}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 40,
          }}
        >
          {[
            { text: "PAGE NOT FOUND", size: 72, d: 10, color: COLORS.error },
            { text: "404", size: 140, d: 40, color: COLORS.error },
            { text: "DEAD LINK", size: 56, d: 70, color: COLORS.textMuted },
            { text: "CONNECTION REFUSED", size: 40, d: 100, color: COLORS.textMuted },
          ].map((item, i) => {
            const itemOpacity = interpolate(
              frame,
              [item.d, item.d + 20],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            );

            return (
              <div
                key={i}
                style={{
                  opacity: itemOpacity,
                }}
              >
                <GlitchText
                  text={item.text}
                  fontSize={item.size}
                  color={item.color}
                  glitchIntensity={6}
                  isGlitching={frame > item.d + 10 && frame < item.d + 200}
                  delay={item.d}
                />
              </div>
            );
          })}
        </AbsoluteFill>
      </Sequence>

      {/* Part 2: Stats and missed opportunity text (350-700) */}
      <Sequence from={350} durationInFrames={350}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 60,
          }}
        >
          <KineticText
            text="Billions of broken links"
            fontSize={72}
            color={COLORS.textPrimary}
            type="reveal"
            delay={360}
          />
          <KineticText
            text="Every 404 is a missed opportunity"
            fontSize={48}
            color={COLORS.amber}
            type="slide"
            delay={430}
          />
        </AbsoluteFill>
      </Sequence>

      {/* Part 3: The question with gradient mesh (700-1050) */}
      <Sequence from={700} durationInFrames={350}>
        <AbsoluteFill>
          <GradientMesh
            animationSpeed={0.02}
            opacity={interpolate(frame, [700, 760], [0, 0.6], {
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
            <KineticText
              text="What if every URL"
              fontSize={64}
              color={COLORS.textPrimary}
              type="reveal"
              delay={720}
            />
            <KineticText
              text="led somewhere useful?"
              fontSize={64}
              color={COLORS.cyan}
              type="scale"
              delay={790}
            />
          </AbsoluteFill>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
