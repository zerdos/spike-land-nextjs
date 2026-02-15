import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { COLORS, TYPOGRAPHY } from "../../lib/constants";
import { RecursiveZoom } from "../../components/animations/RecursiveZoom";
import { KineticText } from "../../components/ui/KineticText";

const ZOOM_LABELS = [
  "Context Engineering",
  "Claude Code Plan Mode",
  "Self-Improving Agent",
  "5-Layer Prompt Stack",
  "Context Engineering",
];

export const Scene08_MetaBuild: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.darkBg,
        fontFamily: TYPOGRAPHY.fontFamily.sans,
      }}
    >
      {/* Full scene: Recursive zoom through layers */}
      <RecursiveZoom labels={ZOOM_LABELS} delay={5} />

      {/* Overlay text at frame 447+ */}
      <Sequence from={447} durationInFrames={224}>
        <AbsoluteFill
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            paddingBottom: 100,
          }}
        >
          <KineticText
            type="scale"
            text="Context engineering all the way down"
            fontSize={42}
            color={COLORS.cyan}
            delay={452}
          />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
