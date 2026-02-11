import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { COLORS, TYPOGRAPHY } from "../../lib/constants";
import { SuccessRateChart } from "../../components/diagrams/SuccessRateChart";
import { CostValueChart } from "../../components/diagrams/CostValueChart";
import { DiminishingReturnsGraph } from "../../components/diagrams/DiminishingReturnsGraph";

export const Scene09_Results: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.darkBg,
        fontFamily: TYPOGRAPHY.fontFamily.sans,
      }}
    >
      {/* Part 1: Success rate comparison bars (0-600, 20s) */}
      <Sequence from={0} durationInFrames={600}>
        <AbsoluteFill
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <SuccessRateChart revealCount={3} delay={10} />
        </AbsoluteFill>
      </Sequence>

      {/* Part 2: Cost vs value chart (600-1200, 20s) */}
      <Sequence from={600} durationInFrames={600}>
        <AbsoluteFill
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CostValueChart delay={10} />
        </AbsoluteFill>
      </Sequence>

      {/* Part 3: Diminishing returns graph with competition line (1200-1800, 20s) */}
      <Sequence from={1200} durationInFrames={600}>
        <AbsoluteFill
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <DiminishingReturnsGraph showCompetitionLine={true} delay={10} />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
