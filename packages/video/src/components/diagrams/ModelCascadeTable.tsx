import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, SPRING_CONFIGS } from "../../lib/constants";
import { stagger } from "../../lib/animations";
import { GlassmorphismCard } from "../ui/GlassmorphismCard";

type ModelCascadeTableProps = {
  delay?: number;
  /** How many rows to reveal (1-3) */
  revealCount?: number;
};

const MODELS = [
  {
    name: "Opus",
    role: "Generator",
    temp: "0.5",
    cost: "$15.00",
    color: "#9945FF",
  },
  {
    name: "Sonnet",
    role: "Fixer",
    temp: "0.2",
    cost: "$3.00",
    color: "#3B82F6",
  },
  {
    name: "Haiku",
    role: "Learner",
    temp: "0.1",
    cost: "$0.25",
    color: "#10B981",
  },
];

const COLUMNS = ["Model", "Role", "Temperature", "Cost/1M tokens"];

export const ModelCascadeTable: React.FC<ModelCascadeTableProps> = ({
  delay = 0,
  revealCount = 3,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerProgress = spring({
    frame: frame - delay,
    fps,
    config: SPRING_CONFIGS.smooth,
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
      }}
    >
      {/* Title */}
      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: COLORS.textPrimary,
          fontFamily: "Inter, sans-serif",
          opacity: headerProgress,
          marginBottom: 8,
        }}
      >
        Model Cascade
      </div>

      {/* Column headers */}
      <div
        style={{
          display: "flex",
          gap: 0,
          opacity: headerProgress,
          width: 720,
          padding: "0 24px",
        }}
      >
        {COLUMNS.map((col) => (
          <div
            key={col}
            style={{
              flex: 1,
              fontSize: 13,
              fontWeight: 600,
              color: COLORS.textMuted,
              fontFamily: "Inter, sans-serif",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {col}
          </div>
        ))}
      </div>

      {/* Rows */}
      {MODELS.map((model, i) => {
        if (i >= revealCount) return null;
        const rowDelay = delay + 10 + stagger(i, 12);
        const rowProgress = spring({
          frame: frame - rowDelay,
          fps,
          config: SPRING_CONFIGS.snappy,
        });

        const glowIntensity = 6 + Math.sin(frame / 15) * 3;
        const isActive = i === 0;

        return (
          <GlassmorphismCard
            key={model.name}
            width={720}
            delay={rowDelay}
            color={model.color}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                position: "relative",
              }}
            >
              {/* Active row glow */}
              {isActive && rowProgress > 0.5 && (
                <div
                  style={{
                    position: "absolute",
                    inset: -16,
                    borderRadius: 16,
                    boxShadow: `0 0 ${glowIntensity}px ${model.color}25`,
                    pointerEvents: "none",
                  }}
                />
              )}

              {/* Model name */}
              <div
                style={{
                  flex: 1,
                  fontSize: 20,
                  fontWeight: 700,
                  color: model.color,
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {model.name}
              </div>

              {/* Role */}
              <div
                style={{
                  flex: 1,
                  fontSize: 16,
                  color: COLORS.textPrimary,
                  fontFamily: "Inter, sans-serif",
                }}
              >
                {model.role}
              </div>

              {/* Temperature */}
              <div
                style={{
                  flex: 1,
                  fontSize: 16,
                  color: COLORS.textSecondary,
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {model.temp}
              </div>

              {/* Cost */}
              <div
                style={{
                  flex: 1,
                  fontSize: 16,
                  fontWeight: 600,
                  color: COLORS.amber,
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {model.cost}
              </div>
            </div>
          </GlassmorphismCard>
        );
      })}
    </div>
  );
};
