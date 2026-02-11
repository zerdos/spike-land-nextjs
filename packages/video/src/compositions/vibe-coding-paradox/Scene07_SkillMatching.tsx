import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { COLORS, TYPOGRAPHY } from "../../lib/constants";
import { SkillMatchingDiagram } from "../../components/diagrams/SkillMatchingDiagram";
import { ImpedanceMatchingAnalogy } from "../../components/diagrams/ImpedanceMatchingAnalogy";

export const Scene07_SkillMatching: React.FC = () => {
  const frame = useCurrentFrame();

  // Second half: matched for first 450 frames, mismatched for last 450
  const impedanceFrame = frame - 900;
  const isMatched = impedanceFrame < 450;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.darkBg,
        fontFamily: TYPOGRAPHY.fontFamily.sans,
      }}
    >
      {/* Part 1: Skill matching diagram with URL parsing (0-900, 30s) */}
      <Sequence from={0} durationInFrames={900}>
        <AbsoluteFill
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <SkillMatchingDiagram url="spike.land/create/games/tetris" delay={10} />
        </AbsoluteFill>
      </Sequence>

      {/* Part 2: Impedance matching analogy (900-1800, 30s) */}
      <Sequence from={900} durationInFrames={900}>
        <AbsoluteFill
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ImpedanceMatchingAnalogy matched={isMatched} delay={10} />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
