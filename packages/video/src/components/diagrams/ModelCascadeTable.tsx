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
    <div className="w-full h-full flex items-center justify-center bg-[#0a0a0f]">
      <ModelCascadeCore 
        revealCount={revealCount} 
        progress={progress} 
        width={1000}
        height={800}
      />
    </div>
  );
};
