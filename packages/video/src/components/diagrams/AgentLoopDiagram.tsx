import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, SPRING_CONFIGS, VERITASIUM_COLORS } from "../../lib/constants";

type AgentState = "PLANNING" | "GENERATING" | "TRANSPILING" | "VERIFYING" | "FIXING" | "LEARNING" | "PUBLISHED";

const STATES: { key: AgentState; label: string; color: string; x: number; y: number }[] = [
  { key: "PLANNING", label: "Planning", color: VERITASIUM_COLORS.planning, x: 960, y: 120 },
  { key: "GENERATING", label: "Generating", color: VERITASIUM_COLORS.generating, x: 1400, y: 300 },
  { key: "TRANSPILING", label: "Transpiling", color: VERITASIUM_COLORS.transpiling, x: 1400, y: 540 },
  { key: "VERIFYING", label: "Verifying", color: VERITASIUM_COLORS.published, x: 960, y: 700 },
  { key: "FIXING", label: "Fixing", color: VERITASIUM_COLORS.fixing, x: 520, y: 540 },
  { key: "LEARNING", label: "Learning", color: VERITASIUM_COLORS.learning, x: 520, y: 300 },
  { key: "PUBLISHED", label: "Published!", color: VERITASIUM_COLORS.published, x: 960, y: 900 },
];

const ARROWS: { from: number; to: number; label?: string }[] = [
  { from: 0, to: 1 },
  { from: 1, to: 2 },
  { from: 2, to: 3, label: "success?" },
  { from: 3, to: 6, label: "yes" },
  { from: 3, to: 4, label: "no" },
  { from: 4, to: 5 },
  { from: 5, to: 1, label: "retry" },
];

type AgentLoopDiagramProps = {
  /** How many states to reveal (0-7), animated over time */
  revealCount?: number;
  /** Currently active state index for glow effect */
  activeState?: number;
  /** Show the loop arrow (fixing -> generating) */
  showLoop?: boolean;
  /** Scale factor */
  scale?: number;
};

export const AgentLoopDiagram: React.FC<AgentLoopDiagramProps> = ({
  revealCount = 7,
  activeState = -1,
  showLoop = true,
  scale = 1,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div style={{
      width: 1920,
      height: 1080,
      position: "relative",
      transform: `scale(${scale})`,
      transformOrigin: "center center",
    }}>
      {/* Connection lines (SVG) */}
      <svg
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}
        viewBox="0 0 1920 1080"
      >
        {ARROWS.map((arrow, i) => {
          if (i >= revealCount) return null;
          if (!showLoop && arrow.from === 5 && arrow.to === 1) return null;

          const fromState = STATES[arrow.from];
          const toState = STATES[arrow.to];
          const lineOpacity = interpolate(
            spring({ frame: frame - i * 12, fps, config: SPRING_CONFIGS.smooth }),
            [0, 1], [0, 0.6]
          );

          const midX = (fromState.x + toState.x) / 2;
          const midY = (fromState.y + toState.y) / 2;

          return (
            <g key={i} opacity={lineOpacity}>
              <line
                x1={fromState.x} y1={fromState.y}
                x2={toState.x} y2={toState.y}
                stroke={COLORS.textMuted}
                strokeWidth={2}
                strokeDasharray="8 4"
              />
              {/* Arrow head */}
              <circle cx={toState.x} cy={toState.y} r={6} fill={COLORS.textMuted} />
              {/* Label */}
              {arrow.label && (
                <text
                  x={midX}
                  y={midY - 12}
                  fill={COLORS.textSecondary}
                  fontSize={14}
                  fontFamily="Inter, sans-serif"
                  textAnchor="middle"
                >
                  {arrow.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* State nodes */}
      {STATES.map((state, i) => {
        if (i >= revealCount) return null;
        const nodeDelay = i * 10;
        const progress = spring({ frame: frame - nodeDelay, fps, config: SPRING_CONFIGS.snappy });
        const isActive = i === activeState;
        const glowSize = isActive ? 20 + Math.sin(frame / 8) * 8 : 0;

        return (
          <div
            key={state.key}
            style={{
              position: "absolute",
              left: state.x - 80,
              top: state.y - 28,
              width: 160,
              height: 56,
              borderRadius: 28,
              background: isActive ? `${state.color}30` : `${state.color}15`,
              border: `2px solid ${state.color}${isActive ? "ff" : "60"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Inter, sans-serif",
              fontSize: 16,
              fontWeight: 600,
              color: state.color,
              transform: `scale(${progress})`,
              boxShadow: isActive
                ? `0 0 ${glowSize}px ${state.color}60, inset 0 0 20px ${state.color}20`
                : `0 4px 12px rgba(0,0,0,0.3)`,
              transition: "box-shadow 0.3s",
            }}
          >
            {state.label}
          </div>
        );
      })}

      {/* Database icon at bottom center */}
      {revealCount >= 5 && (
        <div style={{
          position: "absolute",
          left: 160,
          top: 700,
          opacity: spring({ frame: frame - 60, fps, config: SPRING_CONFIGS.smooth }),
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 12,
            background: `${VERITASIUM_COLORS.learning}20`,
            border: `2px solid ${VERITASIUM_COLORS.learning}60`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            boxShadow: `0 0 ${12 + Math.sin(frame / 10) * 6}px ${VERITASIUM_COLORS.learning}40`,
          }}>
            🧠
          </div>
          <span style={{
            fontSize: 13,
            color: VERITASIUM_COLORS.learning,
            fontFamily: "Inter, sans-serif",
            fontWeight: 500,
          }}>
            Knowledge Base
          </span>
        </div>
      )}
    </div>
  );
};
