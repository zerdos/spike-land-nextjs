import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, SPRING_CONFIGS } from "../../lib/constants";

type ProgressBarProps = {
  progress: number; // 0-100
  label?: string;
  delay?: number;
  showPercentage?: boolean;
  color?: string;
  height?: number;
};

export function ProgressBar({
  progress,
  label,
  delay = 0,
  showPercentage = true,
  color = COLORS.cyan,
  height = 8,
}: ProgressBarProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entryProgress = spring({
    frame: frame - delay,
    fps,
    config: SPRING_CONFIGS.smooth,
  });

  const fillProgress = spring({
    frame: frame - delay - 10,
    fps,
    config: { ...SPRING_CONFIGS.smooth, stiffness: 50 },
  });

  const opacity = interpolate(entryProgress, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  const currentProgress = progress * fillProgress;

  return (
    <div
      style={{
        opacity,
        width: "100%",
      }}
    >
      {(label || showPercentage) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 8,
            fontSize: 14,
            fontFamily: "Inter, sans-serif",
          }}
        >
          {label && <span style={{ color: COLORS.textSecondary }}>{label}</span>}
          {showPercentage && (
            <span style={{ color, fontWeight: 600 }}>
              {Math.round(currentProgress)}%
            </span>
          )}
        </div>
      )}
      <div
        style={{
          width: "100%",
          height: `${height}px`,
          backgroundColor: COLORS.darkBorder,
          borderRadius: height / 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${currentProgress}%`,
            height: "100%",
            backgroundColor: color,
            borderRadius: height / 2,
            boxShadow: `0 0 10px ${color}60`,
          }}
        />
      </div>
    </div>
  );
}

type StageProgressProps = {
  stages: string[];
  currentStage: number;
  delay?: number;
};

export function StageProgress({
  stages,
  currentStage,
  delay = 0,
}: StageProgressProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      {stages.map((stage, index) => {
        const stageDelay = delay + index * 15;
        const isComplete = index < currentStage;
        const isCurrent = index === currentStage;

        const progress = spring({
          frame: frame - stageDelay,
          fps,
          config: SPRING_CONFIGS.snappy,
        });

        const opacity = interpolate(progress, [0, 0.5], [0, 1], {
          extrapolateRight: "clamp",
        });

        const scale = interpolate(progress, [0, 1], [0.8, 1]);

        const dotColor = isComplete
          ? COLORS.success
          : isCurrent
          ? COLORS.cyan
          : COLORS.darkBorder;

        return (
          <div
            key={stage}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              opacity,
              transform: `scale(${scale})`,
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: dotColor,
                boxShadow: isCurrent ? `0 0 10px ${COLORS.cyan}80` : "none",
              }}
            />
            <span
              style={{
                fontSize: 12,
                color: isCurrent ? COLORS.textPrimary : COLORS.textMuted,
                fontFamily: "Inter, sans-serif",
              }}
            >
              {stage}
            </span>
            {index < stages.length - 1 && (
              <div
                style={{
                  width: 30,
                  height: 2,
                  backgroundColor: isComplete ? COLORS.success : COLORS.darkBorder,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
