import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, SPRING_CONFIGS, VERITASIUM_COLORS } from "../../lib/constants";

type DataFlywheelProps = {
  /** Rotation speed multiplier (accelerates over time) */
  speed?: number;
  delay?: number;
};

const SEGMENTS = [
  { label: "Users", color: VERITASIUM_COLORS.flywheel, icon: "👥" },
  { label: "Apps", color: VERITASIUM_COLORS.generating, icon: "📱" },
  { label: "Errors", color: VERITASIUM_COLORS.fixing, icon: "⚠️" },
  { label: "Notes", color: VERITASIUM_COLORS.learning, icon: "📝" },
  { label: "Better Apps", color: VERITASIUM_COLORS.published, icon: "✨" },
  { label: "More Users", color: VERITASIUM_COLORS.planning, icon: "🚀" },
];

export const DataFlywheel: React.FC<DataFlywheelProps> = ({
  speed = 1,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entryProgress = spring({ frame: frame - delay, fps, config: SPRING_CONFIGS.heavy });
  // Accelerating rotation
  const elapsed = Math.max(0, frame - delay);
  const acceleration = 0.0003 * speed;
  const rotation = elapsed * 0.3 * speed + acceleration * elapsed * elapsed * 0.5;

  const centerX = 480;
  const centerY = 400;
  const radius = 280;

  return (
    <div style={{
      width: 960,
      height: 800,
      position: "relative",
      transform: `scale(${entryProgress})`,
      opacity: interpolate(entryProgress, [0, 0.5], [0, 1], { extrapolateRight: "clamp" }),
    }}>
      {/* Center label */}
      <div style={{
        position: "absolute",
        left: centerX - 80,
        top: centerY - 40,
        width: 160,
        height: 80,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
      }}>
        <div style={{
          fontSize: 20,
          fontWeight: 700,
          color: COLORS.textPrimary,
          fontFamily: "Inter, sans-serif",
          textAlign: "center",
        }}>
          Data Flywheel
        </div>
        <div style={{
          fontSize: 13,
          color: COLORS.textMuted,
          fontFamily: "Inter, sans-serif",
        }}>
          self-reinforcing
        </div>
      </div>

      {/* Connecting circle */}
      <svg
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}
        viewBox="0 0 960 800"
      >
        <circle
          cx={centerX} cy={centerY} r={radius}
          fill="none"
          stroke={`${VERITASIUM_COLORS.flywheel}20`}
          strokeWidth={3}
          strokeDasharray="12 8"
        />
        {/* Spinning highlight arc */}
        <circle
          cx={centerX} cy={centerY} r={radius}
          fill="none"
          stroke={VERITASIUM_COLORS.flywheel}
          strokeWidth={4}
          strokeDasharray="80 640"
          strokeLinecap="round"
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: `${centerX}px ${centerY}px`,
          }}
          opacity={0.8}
        />
      </svg>

      {/* Segment nodes */}
      {SEGMENTS.map((seg, i) => {
        const angle = (i / SEGMENTS.length) * Math.PI * 2 - Math.PI / 2 + (rotation * Math.PI / 180);
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        const nodeDelay = delay + i * 8;
        const nodeProgress = spring({ frame: frame - nodeDelay, fps, config: SPRING_CONFIGS.snappy });

        return (
          <div key={seg.label} style={{
            position: "absolute",
            left: x - 56,
            top: y - 56,
            width: 112,
            height: 112,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 56,
            background: `${seg.color}15`,
            border: `2px solid ${seg.color}60`,
            transform: `scale(${nodeProgress})`,
            boxShadow: `0 4px 20px ${seg.color}20`,
          }}>
            <span style={{ fontSize: 24 }}>{seg.icon}</span>
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: seg.color,
              fontFamily: "Inter, sans-serif",
              marginTop: 4,
              textAlign: "center",
              lineHeight: 1.1,
            }}>
              {seg.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};
