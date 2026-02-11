import type { FC } from "react";
import { COLORS, VERITASIUM_COLORS } from "../../lib/constants";

export type RecursiveZoomCoreProps = {
  labels: string[];
  progress: number;
  zoomSpeed?: number;
  width?: number | string;
  height?: number | string;
  className?: string;
};

const LAYER_COLORS = [
  VERITASIUM_COLORS.planning,
  VERITASIUM_COLORS.generating,
  VERITASIUM_COLORS.transpiling,
  VERITASIUM_COLORS.fixing,
  VERITASIUM_COLORS.learning,
  VERITASIUM_COLORS.published,
];


import { interpolate } from "../../lib/animation-utils";

export const RecursiveZoomCore: FC<RecursiveZoomCoreProps> = ({
  labels,
  progress,
  zoomSpeed = 0.8,
  width = "100%",
  height = "100%",
  className,
}) => {
  const zoomFactor = progress * zoomSpeed * 30; // Scale progress for zoom effect
  const layerCount = labels.length;

  return (
    <div
      className={className}
      style={{
        width,
        height,
        background: COLORS.darkBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {labels.map((label, i) => {
        const layerIndex = i % layerCount;
        const color = LAYER_COLORS[layerIndex % LAYER_COLORS.length];

        // Continuous zoom logic based on progress
        const baseScale = 0.15 + (i / layerCount) * 0.85;
        // In the video, elapsed time was used. Here we use zoomFactor which is derived from progress.
        // i * 0.5 was the offset.
        const animatedScale = interpolate(
          zoomFactor,
          [i * 0.5, i * 0.5 + 2],
          [baseScale * 0.3, baseScale]
        );

        const opacity = interpolate(
          zoomFactor,
          [i * 0.5, i * 0.5 + 0.5, i * 0.5 + 2.5, i * 0.5 + 3],
          [0, 1, 1, 0.3]
        );

        const size = 600 * animatedScale;

        if (opacity <= 0) return null;

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
              }}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
