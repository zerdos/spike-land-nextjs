import React from "react";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, TYPOGRAPHY, VERITASIUM_COLORS } from "../../lib/constants";
import { ReviewerAgentCard } from "../../components/ui/ReviewerAgentCard";
import { ELOChartDiagram } from "../../components/diagrams/ELOChartDiagram";
import { SoftmaxEquation } from "../../components/ui/SoftmaxEquation";
import { KineticText } from "../../components/ui/KineticText";

export const Scene04_Reviewers: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps: _fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.darkBg,
        fontFamily: TYPOGRAPHY.fontFamily.sans,
      }}
    >
      {/* Part 1: Two reviewer cards appearing side by side (0-450) */}
      <Sequence from={0} durationInFrames={450}>
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
              fontSize: TYPOGRAPHY.fontSize["4xl"],
              fontWeight: 700,
              color: COLORS.textPrimary,
              opacity: interpolate(frame, [10, 30], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            AI Review System
          </div>
          <div
            style={{
              display: "flex",
              gap: 60,
              alignItems: "flex-start",
            }}
          >
            <ReviewerAgentCard
              name="Plan Reviewer"
              model="claude-opus-4-6"
              elo={1650}
              wins={142}
              losses={28}
              color={VERITASIUM_COLORS.planning}
              delay={30}
            />
            <ReviewerAgentCard
              name="Code Reviewer"
              model="claude-sonnet-4-5"
              elo={1420}
              wins={98}
              losses={52}
              color={COLORS.amber}
              delay={50}
            />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Part 2: ELO chart with softmax equation (450-900) */}
      <Sequence from={450} durationInFrames={450}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 40,
          }}
        >
          <ELOChartDiagram delay={460} />
          <div
            style={{
              opacity: interpolate(frame, [600, 630], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            <SoftmaxEquation variant="softmax" delay={610} />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Part 3: Quality improvement text (900-1350) */}
      <Sequence from={900} durationInFrames={450}>
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
            text="Over time, review quality"
            fontSize={64}
            color={COLORS.textPrimary}
            type="reveal"
            delay={920}
          />
          <KineticText
            text="improves automatically"
            fontSize={64}
            color={COLORS.success}
            type="scale"
            delay={990}
          />
          <div
            style={{
              marginTop: 20,
              fontSize: TYPOGRAPHY.fontSize.xl,
              color: COLORS.textMuted,
              opacity: interpolate(frame, [1050, 1080], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            Better reviewers get selected more often via softmax weighting
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
