import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, SPRING_CONFIGS, VERITASIUM_COLORS } from "../../lib/constants";
import { DataFlywheel } from "../../components/diagrams";

const EC = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

export const Scene06_Implications: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- Phase 1: Title (0-150f) ---
  const titleOpacity = interpolate(frame, [0, 40], [0, 1], EC);
  const titleY = interpolate(frame, [0, 40], [30, 0], EC);
  const titleScale = spring({
    frame,
    fps,
    config: SPRING_CONFIGS.smooth,
  });
  const titleExit = interpolate(frame, [120, 150], [1, 0], EC);

  // --- Phase 2: Flywheel (150-600f) ---
  const flywheelEntry = interpolate(frame, [150, 180], [0, 1], EC);

  // --- Phase 3: Quote overlay (600-750f) ---
  const overlayOpacity = interpolate(frame, [600, 650], [0, 0.7], EC);
  const quoteOpacity = interpolate(frame, [620, 680], [0, 1], EC);
  const quoteY = interpolate(frame, [620, 680], [20, 0], EC);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.darkBg,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* Phase 1: Title — "The Data Flywheel" */}
      {frame < 150 && (
        <AbsoluteFill
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: titleOpacity * titleExit,
            transform: `translateY(${titleY}px) scale(${titleScale})`,
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: 80,
                fontWeight: 900,
                color: COLORS.textPrimary,
                letterSpacing: -2,
                lineHeight: 1.1,
              }}
            >
              The{" "}
              <span style={{ color: VERITASIUM_COLORS.flywheel }}>
                Data Flywheel
              </span>
            </div>
            <div
              style={{
                fontSize: 28,
                color: COLORS.textSecondary,
                marginTop: 16,
                fontWeight: 500,
                letterSpacing: 4,
                textTransform: "uppercase",
              }}
            >
              Self-Reinforcing Intelligence
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* Phase 2: DataFlywheel spinning (150-750f, persists through phase 3) */}
      {frame >= 150 && (
        <AbsoluteFill
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: flywheelEntry,
          }}
        >
          <DataFlywheel speed={0.5} delay={150} />
        </AbsoluteFill>
      )}

      {/* Phase 3: Dark overlay + quote text (600-750f) */}
      {frame >= 600 && (
        <>
          {/* Darkening overlay */}
          <AbsoluteFill
            style={{
              backgroundColor: `rgba(10, 10, 15, ${overlayOpacity})`,
            }}
          />

          {/* Quote text */}
          <AbsoluteFill
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 120,
              opacity: quoteOpacity,
              transform: `translateY(${quoteY}px)`,
            }}
          >
            <div
              style={{
                textAlign: "center",
                maxWidth: 1200,
              }}
            >
              <div
                style={{
                  fontSize: 40,
                  fontWeight: 300,
                  color: COLORS.textPrimary,
                  lineHeight: 1.5,
                  fontStyle: "italic",
                }}
              >
                "You can't replicate it by copying code.{" "}
                <span
                  style={{
                    color: VERITASIUM_COLORS.flywheel,
                    fontWeight: 600,
                  }}
                >
                  You can only replicate it by serving the same users
                </span>{" "}
                and accumulating the same mistakes."
              </div>

              {/* Subtle decorative line */}
              <div
                style={{
                  width: interpolate(frame, [660, 720], [0, 200], EC),
                  height: 2,
                  backgroundColor: VERITASIUM_COLORS.flywheel,
                  margin: "30px auto 0",
                  opacity: 0.6,
                }}
              />
            </div>
          </AbsoluteFill>
        </>
      )}
    </AbsoluteFill>
  );
};
