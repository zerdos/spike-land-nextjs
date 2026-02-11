import type { FC } from "react";
import { COLORS, VERITASIUM_COLORS } from "../../lib/constants";

export type BayesianConfidenceCoreProps = {
  helps: number;
  fails: number;
  progress: number;
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
};


export const BayesianConfidenceCore: FC<BayesianConfidenceCoreProps> = ({
  helps,
  fails,
  progress,
  width = "100%",
  height = "100%",
  className,
  style,
}) => {
  const confidence = (helps + 1) / (helps + fails + 2);

  const status = confidence > 0.8 ? "ACTIVE" : confidence > 0.4 ? "CANDIDATE" : "DEPRECATED";
  const statusColor = status === "ACTIVE" 
    ? VERITASIUM_COLORS.active 
    : status === "CANDIDATE" 
    ? VERITASIUM_COLORS.candidate 
    : VERITASIUM_COLORS.deprecated;

  return (
    <div
      className={className}
      style={{
        ...style,
        width,
        height,
        background: COLORS.darkBg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
        gap: 24,
        opacity: progress,
        transform: `scale(${0.95 + 0.05 * progress})`,
      }}
    >
      {/* Confidence gauge */}
      <div style={{ position: "relative", width: 300, height: 160 }}>
        <svg width="300" height="160" viewBox="0 0 300 160">
          <path
            d="M 50 140 A 100 100 0 0 1 250 140"
            fill="none"
            stroke={COLORS.darkBorder}
            strokeWidth="20"
            strokeLinecap="round"
          />
          <path
            d="M 50 140 A 100 100 0 0 1 250 140"
            fill="none"
            stroke={statusColor}
            strokeWidth="20"
            strokeLinecap="round"
            strokeDasharray={`${confidence * 314} 314`}
            style={{ transition: "stroke 0.5s, stroke-dasharray 0.5s" }}
          />
          <text
            x="150"
            y="130"
            textAnchor="middle"
            fill={COLORS.textPrimary}
            fontSize="48"
            fontWeight="800"
            fontFamily="JetBrains Mono, monospace"
            dominantBaseline="middle"
          >
            {Math.round(confidence * 100)}%
          </text>
        </svg>
      </div>

      {/* Status badge */}
      <div
        style={{
          padding: "8px 24px",
          borderRadius: 30,
          background: `${statusColor}15`,
          border: `2px solid ${statusColor}60`,
          color: statusColor,
          fontSize: 18,
          fontWeight: 800,
          letterSpacing: 2,
          fontFamily: "Inter, sans-serif",
          transition: "all 0.5s",
        }}
      >
        {status}
      </div>

      {/* Stats */}
      <div
        style={{
          display: "flex",
          gap: 32,
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 16,
        }}
      >
        <div style={{ color: VERITASIUM_COLORS.active }}>
          HELPS: <span style={{ fontWeight: 700 }}>{helps}</span>
        </div>
        <div style={{ color: VERITASIUM_COLORS.failed }}>
          FAILS: <span style={{ fontWeight: 700 }}>{fails}</span>
        </div>
      </div>

      {/* Probability formula (Veritasium style tip) */}
      <div
        style={{
          marginTop: 12,
          fontSize: 14,
          color: COLORS.textMuted,
          fontFamily: "JetBrains Mono, monospace",
          opacity: 0.8,
        }}
      >
        P = (h + 1) / (h + f + 2)
      </div>
    </div>
  );
};
