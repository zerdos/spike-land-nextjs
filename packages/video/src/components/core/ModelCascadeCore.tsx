import type { FC } from "react";
import { COLORS } from "../../lib/constants";
import { GlassmorphismCardCore } from "./ui/GlassmorphismCardCore";

export type ModelCascadeCoreProps = {
  revealCount: number;
  progress: number;
  highlightIndex?: number;
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
};

const MODELS = [
  {
    name: "Opus",
    role: "Generator",
    temp: "0.5",
    cost: "$15.00",
    color: "#9945FF",
    description: "Creative & Large",
  },
  {
    name: "Sonnet",
    role: "Fixer",
    temp: "0.2",
    cost: "$3.00",
    color: "#3B82F6",
    description: "Precise & Fast",
  },
  {
    name: "Haiku",
    role: "Learner",
    temp: "0.1",
    cost: "$0.25",
    color: "#10B981",
    description: "Cheap & Efficient",
  },
];

const COLUMNS = ["Model", "Role", "Temperature", "Cost/1M"];

const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

export const ModelCascadeCore: FC<ModelCascadeCoreProps> = ({
  revealCount,
  progress,
  highlightIndex = -1,
  width = "100%",
  height = "100%",
  className,
  style,
}) => {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        padding: 20,
        background: COLORS.darkBg,
        width,
        height: typeof height === "number" ? `${height}px` : height,
        ...style,
      }}
    >
      {/* Title */}
      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: COLORS.textPrimary,
          fontFamily: "Inter, sans-serif",
          opacity: progress,
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
          opacity: progress,
          width: "100%",
          maxWidth: 720,
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
        
        const rowProgress = clamp((progress - (i * 0.15)) * 4, 0, 1);
        if (rowProgress <= 0) return null;

        const isHighlighted = i === highlightIndex;

        return (
          <GlassmorphismCardCore
            key={model.name}
            width="100%"
            style={{ maxWidth: 720 }}
            progress={rowProgress}
            color={model.color}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                position: "relative",
                opacity: isHighlighted || highlightIndex === -1 ? 1 : 0.4,
                transition: "opacity 0.3s",
              }}
            >
              {/* Model name */}
              <div
                style={{
                  flex: 1,
                  fontSize: 20,
                  fontWeight: 700,
                  color: model.color,
                  fontFamily: "JetBrains Mono, monospace",
                  minWidth: 80,
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
          </GlassmorphismCardCore>
        );
      })}
    </div>
  );
};
