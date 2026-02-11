import React from "react";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, TYPOGRAPHY, VERITASIUM_COLORS } from "../../lib/constants";
import { TokenVisualization } from "../../components/animations/TokenVisualization";
import { SoftmaxEquation } from "../../components/ui/SoftmaxEquation";
import { AttentionSpotlight } from "../../components/animations/AttentionSpotlight";
import { AttentionPie } from "../../components/ui/AttentionPie";
import { AccuracyDropChart } from "../../components/diagrams/AccuracyDropChart";

export const Scene02_PhysicsOfAttention: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps: _fps } = useVideoConfig();

  // Animate token count for AttentionSpotlight (frames 1080-1620)
  const spotlightLocalFrame = frame - 1080;
  const animatedTokenCount = Math.round(
    interpolate(spotlightLocalFrame, [0, 540], [3, 20], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

  // Engineered pie (3 segments, equal)
  const engineeredSegments = [
    { label: "Identity", value: 33, color: VERITASIUM_COLORS.planning },
    { label: "Knowledge", value: 33, color: VERITASIUM_COLORS.generating },
    { label: "Tools", value: 34, color: VERITASIUM_COLORS.learning },
  ];

  // Vibe coded pie (20 small random segments)
  const vibeSegments = Array.from({ length: 20 }, (_, i) => ({
    label: `tok-${i}`,
    value: 4 + Math.sin(i * 3.7) * 3,
    color: [
      VERITASIUM_COLORS.planning,
      VERITASIUM_COLORS.generating,
      VERITASIUM_COLORS.transpiling,
      VERITASIUM_COLORS.fixing,
      VERITASIUM_COLORS.learning,
      COLORS.cyan,
      COLORS.fuchsia,
      COLORS.amber,
    ][i % 8]!,
  }));

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.darkBg,
        fontFamily: TYPOGRAPHY.fontFamily.sans,
      }}
    >
      {/* Part 1: Token visualization */}
      <Sequence from={0} durationInFrames={540}>
        <TokenVisualization
          text="A token is the atomic unit of an AI model's world"
          delay={15}
          tokensPerWord={2}
        />
      </Sequence>

      {/* Part 2: Softmax equation */}
      <Sequence from={540} durationInFrames={540}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 40,
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: COLORS.textSecondary,
              opacity: interpolate(frame - 540, [0, 20], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            The Attention Mechanism
          </div>
          <SoftmaxEquation variant="softmax" delay={560} />
          <div
            style={{
              fontSize: 18,
              color: COLORS.textMuted,
              maxWidth: 700,
              textAlign: "center",
              lineHeight: 1.6,
              fontFamily: TYPOGRAPHY.fontFamily.mono,
              opacity: interpolate(frame - 540, [60, 90], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            Each token competes for attention. More tokens = less attention per
            token.
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Part 3: Attention spotlight - growing token count */}
      <Sequence from={1080} durationInFrames={540}>
        <AttentionSpotlight tokenCount={animatedTokenCount} delay={5} />
      </Sequence>

      {/* Part 4: Two AttentionPie charts side-by-side */}
      <Sequence from={1620} durationInFrames={540}>
        <AbsoluteFill
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 120,
          }}
        >
          {/* Engineered prompt - 3 segments */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 20,
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: COLORS.success,
                opacity: interpolate(frame - 1620, [0, 20], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
              }}
            >
              Engineered Prompt
            </div>
            <AttentionPie
              segments={engineeredSegments}
              size={360}
              delay={1635}
            />
            <div
              style={{
                fontSize: 16,
                color: COLORS.textMuted,
                fontFamily: TYPOGRAPHY.fontFamily.mono,
                opacity: interpolate(frame - 1620, [40, 60], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
              }}
            >
              3 sections — high attention each
            </div>
          </div>

          {/* Vibe coded - 20 segments */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 20,
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: COLORS.error,
                opacity: interpolate(frame - 1620, [30, 50], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
              }}
            >
              Vibe Coded Prompt
            </div>
            <AttentionPie
              segments={vibeSegments}
              size={360}
              delay={1665}
            />
            <div
              style={{
                fontSize: 16,
                color: COLORS.textMuted,
                fontFamily: TYPOGRAPHY.fontFamily.mono,
                opacity: interpolate(frame - 1620, [70, 90], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
              }}
            >
              20 fragments — diluted attention
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Part 5: Accuracy drop chart */}
      <Sequence from={2160} durationInFrames={540}>
        <AbsoluteFill
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AccuracyDropChart delay={2175} />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
