import type { FC } from "react";
import { COLORS, VERITASIUM_COLORS } from "../../lib/constants";

export type AgentState = "PLANNING" | "GENERATING" | "TRANSPILING" | "VERIFYING" | "FIXING" | "LEARNING" | "PUBLISHED";

export const STATES: { key: AgentState; label: string; color: string; x: number; y: number }[] = [
  { key: "PLANNING", label: "Planning", color: VERITASIUM_COLORS.planning, x: 960, y: 120 },
  { key: "GENERATING", label: "Generating", color: VERITASIUM_COLORS.generating, x: 1400, y: 300 },
  { key: "TRANSPILING", label: "Transpiling", color: VERITASIUM_COLORS.transpiling, x: 1400, y: 540 },
  { key: "VERIFYING", label: "Verifying", color: VERITASIUM_COLORS.published, x: 960, y: 700 },
  { key: "FIXING", label: "Fixing", color: VERITASIUM_COLORS.fixing, x: 520, y: 540 },
  { key: "LEARNING", label: "Learning", color: VERITASIUM_COLORS.learning, x: 520, y: 300 },
  { key: "PUBLISHED", label: "Published!", color: VERITASIUM_COLORS.published, x: 960, y: 900 },
];

export const ARROWS: { from: number; to: number; label?: string }[] = [
  { from: 0, to: 1 },
  { from: 1, to: 2 },
  { from: 2, to: 3, label: "success?" },
  { from: 3, to: 6, label: "yes" },
  { from: 3, to: 4, label: "no" },
  { from: 4, to: 5 },
  { from: 5, to: 1, label: "retry" },
];

export type AgentLoopCoreProps = {
  revealCount?: number;
  activeState?: number;
  showLoop?: boolean;
  progress: number; // 0-1 for reveal animations
  width?: number | string;
  height?: number | string;
  className?: string;
};

const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

export const AgentLoopCore: FC<AgentLoopCoreProps> = ({
  revealCount = 7,
  activeState = -1,
  showLoop = true,
  progress,
  width = "100%",
  height = "100%",
  className,
}) => {
  return (
    <div
      className={className}
      style={{
        width,
        height,
        position: "relative",
        background: COLORS.darkBg,
        overflow: "hidden",
      }}
    >
      <div 
        style={{ 
          width: 1920, 
          height: 1080, 
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%) scale(0.6)", // Default scale for blog
        }}
      >
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

            if (!fromState || !toState) return null;
            
            // Line entrance animation
            const lineProgress = clamp((progress - (i * 0.1)) * 5, 0, 1);
            if (lineProgress <= 0) return null;

            const midX = (fromState.x + toState.x) / 2;
            const midY = (fromState.y + toState.y) / 2;

            return (
              <g key={i} opacity={lineProgress * 0.6}>
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
          
          const nodeProgress = clamp((progress - (i * 0.1)) * 5, 0, 1);
          if (nodeProgress <= 0) return null;

          const isActive = i === activeState;
          const glowSize = isActive ? 20 : 0; // Simplified for core

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
                transform: `scale(${nodeProgress})`,
                boxShadow: isActive
                  ? `0 0 ${glowSize}px ${state.color}60, inset 0 0 20px ${state.color}20`
                  : `0 4px 12px rgba(0,0,0,0.3)`,
                transition: "background 0.3s, border 0.3s, box-shadow 0.3s",
              }}
            >
              {state.label}
            </div>
          );
        })}

        {/* Database icon at bottom center */}
        {revealCount >= 5 && progress > 0.8 && (
          <div style={{
            position: "absolute",
<<<<<<< HEAD
            left: 266,
=======
            left: 160,
>>>>>>> origin/main
            top: 700,
            opacity: clamp((progress - 0.8) * 5, 0, 1),
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
    </div>
  );
};
