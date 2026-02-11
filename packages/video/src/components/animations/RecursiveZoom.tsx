import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { RecursiveZoomCore } from "../core/RecursiveZoomCore";

type RecursiveZoomProps = {
  labels: string[];
  delay?: number;
  zoomSpeed?: number;
};

export function RecursiveZoom({
  labels,
  delay = 0,
  zoomSpeed = 0.8,
}: RecursiveZoomProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const elapsed = Math.max(0, frame - delay);
  const progress = elapsed / (fps * 30); // Normalize based on 30s or similar

  return (
    <AbsoluteFill>
      <RecursiveZoomCore 
        labels={labels} 
        progress={progress} 
        zoomSpeed={zoomSpeed} 
      />
    </AbsoluteFill>
  );
}
