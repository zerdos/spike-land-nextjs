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
import { typewriter } from "../../lib/animations";
import { BrowserFrame } from "../../components/mockups/BrowserFrame";
import { FourOhFourSkull } from "../../components/animations/FourOhFourSkull";
import { KineticText } from "../../components/ui/KineticText";
import { GradientMesh } from "../../components/branding/GradientMesh";

export const Scene01_Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const url = "spike.land/games/tetris";
  const visibleUrl = typewriter(frame, fps, url, 20, 15);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.darkBg,
        fontFamily: TYPOGRAPHY.fontFamily.sans,
      }}
    >
      {/* Part 1: Browser frame with typewriter URL (0-250) */}
      <Sequence from={0} durationInFrames={250}>
        <AbsoluteFill
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 80,
          }}
        >
          <BrowserFrame url={visibleUrl} width={1400} height={750}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                background: `linear-gradient(135deg, ${COLORS.darkBg}, #1a1a2e)`,
              }}
            >
              <div
                style={{
                  fontSize: 72,
                  fontWeight: 700,
                  color: COLORS.textMuted,
                  fontFamily: TYPOGRAPHY.fontFamily.mono,
                  opacity: interpolate(frame, [80, 110], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                }}
              >
                Loading...
              </div>
            </div>
          </BrowserFrame>
        </AbsoluteFill>
      </Sequence>

      {/* Part 2: 404 skull transforms into live app (250-500) */}
      <Sequence from={250} durationInFrames={250}>
        <AbsoluteFill
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FourOhFourSkull delay={0} />
        </AbsoluteFill>
      </Sequence>

      {/* Part 3: Tagline with gradient mesh (500-750) */}
      <Sequence from={500} durationInFrames={250}>
        <AbsoluteFill>
          <GradientMesh
            animationSpeed={0.015}
            opacity={interpolate(frame, [500, 560], [0, 1], {
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
              gap: 30,
            }}
          >
            <KineticText
              text="Every URL is an app"
              fontSize={80}
              color={COLORS.textPrimary}
              type="reveal"
              delay={520}
            />
            <KineticText
              text="waiting to be born"
              fontSize={80}
              color={COLORS.cyan}
              type="scale"
              delay={580}
            />
            <div
              style={{
                marginTop: 30,
                fontSize: 24,
                color: COLORS.textSecondary,
                fontFamily: TYPOGRAPHY.fontFamily.sans,
                opacity: spring({
                  frame: frame - 640,
                  fps,
                  config: SPRING_CONFIGS.smooth,
                }),
              }}
            >
              No More 404s
            </div>
          </AbsoluteFill>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
