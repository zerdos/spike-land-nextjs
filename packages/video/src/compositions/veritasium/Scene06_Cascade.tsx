import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ModelCascadeCore } from "../../components/core/ModelCascadeCore";
import { SPRING_CONFIGS } from "../../lib/constants";

export function Scene06_Cascade() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame,
    fps,
    config: SPRING_CONFIGS.gentle,
  });

  return (
    <AbsoluteFill className="bg-black">
      <ModelCascadeCore progress={progress} revealCount={3} className="w-full h-full scale-90" />
    </AbsoluteFill>
  );
}
