import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, SPRING_CONFIGS } from "../../lib/constants";

type DeploymentStep = {
  label: string;
  status: "pending" | "success";
};

type DeploymentSequenceProps = {
  steps: DeploymentStep[];
  delay?: number;
};

export const DeploymentSequence: React.FC<DeploymentSequenceProps> = ({
  steps,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        position: "relative",
      }}
    >
      {/* Timeline line */}
      <div
        style={{
          position: "absolute",
          left: 15,
          top: 0,
          bottom: 0,
          width: 2,
          background: "rgba(255, 255, 255, 0.1)",
        }}
      />

      {steps.map((step, i) => {
        const stepDelay = delay + i * 15;
        const progress = spring({
          frame: frame - stepDelay,
          fps,
          config: SPRING_CONFIGS.snappy,
        });

        const opacity = interpolate(progress, [0, 1], [0, 1]);
        const x = interpolate(progress, [0, 1], [-10, 0]);

        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              opacity,
              transform: `translateX(${x}px)`,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: step.status === "success" ? COLORS.success : COLORS.darkCard,
                border: `2px solid ${step.status === "success" ? COLORS.success : COLORS.textMuted}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1,
              }}
            >
              {step.status === "success" && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: step.status === "success" ? COLORS.textPrimary : COLORS.textSecondary,
              }}
            >
              {step.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};
