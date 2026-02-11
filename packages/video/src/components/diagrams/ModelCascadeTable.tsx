import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SPRING_CONFIGS } from "../../lib/constants";
import { ModelCascadeCore } from "../core/ModelCascadeCore";

type ModelCascadeTableProps = {
  delay?: number;
  /** How many rows to reveal (1-3) */
  revealCount?: number;
};

export const ModelCascadeTable: React.FC<ModelCascadeTableProps> = ({
  delay = 0,
  revealCount = 3,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: SPRING_CONFIGS.smooth,
  });

  return (
    <div style={{ width: 1920, height: 1080, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <ModelCascadeCore 
        revealCount={revealCount} 
        progress={progress} 
        width={1000}
        height={800}
      />
    </div>
  );
};
