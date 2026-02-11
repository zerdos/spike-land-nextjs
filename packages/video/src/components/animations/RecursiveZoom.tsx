import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, VERITASIUM_COLORS } from "../../lib/constants";

type RecursiveZoomProps = {
  labels: string[];
  delay?: number;
  zoomSpeed?: number;
};

const LAYER_COLORS = [
  VERITASIUM_COLORS.planning,
  VERITASIUM_COLORS.generating,
  VERITASIUM_COLORS.transpiling,
  VERITASIUM_COLORS.fixing,
  VERITASIUM_COLORS.learning,
  VERITASIUM_COLORS.published,
];

export function RecursiveZoom({
  labels,
  delay = 0,
  zoomSpeed = 0.8,
}: RecursiveZoomProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const elapsed = Math.max(0, frame - delay);
  const zoomProgress = (elapsed / fps) * zoomSpeed;

  const layerCount = labels.length;

  return (
    <AbsoluteFill
      style={{
        background: COLORS.darkBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {labels.map((label, i) => {
        const layerIndex = i % layerCount;
        const color = LAYER_COLORS[layerIndex % LAYER_COLORS.length];

        // Each layer zooms from small to large continuously
        const baseScale = 0.15 + (i / layerCount) * 0.85;
        const animatedScale = interpolate(
          zoomProgress,
          [i * 0.5, i * 0.5 + 2],
          [baseScale * 0.3, baseScale],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );

        const opacity = interpolate(
          zoomProgress,
          [i * 0.5, i * 0.5 + 0.5, i * 0.5 + 2.5, i * 0.5 + 3],
          [0, 1, 1, 0.3],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );

        const size = 600 * animatedScale;

        return (
          <div
            key={`layer-${i}`}
            style={{
              position: "absolute",
              width: size,
              height: size,
              border: `2px solid ${color}`,
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity,
              background: `${color}08`,
              boxShadow: `inset 0 0 30px ${color}10`,
              transform: `scale(${animatedScale})`,
            }}
          >
            <span
              style={{
                color,
                fontSize: 20,
                fontFamily: "JetBrains Mono, monospace",
                fontWeight: 600,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                opacity: interpolate(opacity, [0, 0.5, 1], [0, 0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
              }}
            >
              {label}
            </span>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}
