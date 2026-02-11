import React from "react";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  useCurrentFrame,
} from "remotion";
import { COLORS, TYPOGRAPHY } from "../../lib/constants";
import { DarwinianTree } from "../../components/animations/DarwinianTree";
import { AgentLoopDiagram } from "../../components/diagrams/AgentLoopDiagram";
import { TemperatureGauge } from "../../components/diagrams/TemperatureGauge";
import { ModelCascadeTable } from "../../components/diagrams/ModelCascadeTable";

export const Scene05_FixLoop: React.FC = () => {
  const frame = useCurrentFrame();

  // Animate DarwinianTree generations (frames 0-750)
  const treeGenerations = Math.min(
    3,
    Math.floor(interpolate(frame, [60, 600], [1, 3.9], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })),
  ) as 1 | 2 | 3;

  // Cycle active state through 0-6 for AgentLoopDiagram (frames 750-1350)
  const loopLocalFrame = frame - 750;
  const activeState =
    loopLocalFrame > 30 ? Math.floor((loopLocalFrame - 30) / 60) % 7 : -1;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.darkBg,
        fontFamily: TYPOGRAPHY.fontFamily.sans,
      }}
    >
      {/* Part 1: Darwinian tree - evolutionary pruning */}
      <Sequence from={0} durationInFrames={750}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 40,
              fontSize: 28,
              fontWeight: 700,
              color: COLORS.textPrimary,
              opacity: interpolate(frame, [0, 20], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              zIndex: 10,
            }}
          >
            Darwinian Code Selection
          </div>
          <DarwinianTree generations={treeGenerations} delay={20} />
        </AbsoluteFill>
      </Sequence>

      {/* Part 2: Agent loop diagram with cycling active state */}
      <Sequence from={750} durationInFrames={600}>
        <AbsoluteFill
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AgentLoopDiagram
            revealCount={7}
            activeState={activeState}
            showLoop
            scale={0.8}
          />
        </AbsoluteFill>
      </Sequence>

      {/* Part 3: Temperature gauge */}
      <Sequence from={1350} durationInFrames={450}>
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
              fontSize: 28,
              fontWeight: 700,
              color: COLORS.textPrimary,
              opacity: interpolate(frame - 1350, [0, 20], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            Temperature Tuning by Role
          </div>
          <TemperatureGauge delay={1365} showLabels />
        </AbsoluteFill>
      </Sequence>

      {/* Part 4: Model cascade table */}
      <Sequence from={1800} durationInFrames={450}>
        <AbsoluteFill
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ModelCascadeTable delay={1815} revealCount={3} />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
