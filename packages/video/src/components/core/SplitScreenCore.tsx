import { type ReactNode, type FC } from "react";
import { COLORS } from "../../lib/constants";

export type SplitScreenCoreProps = {
  leftContent: ReactNode;
  rightContent: ReactNode;
  progress: number; // 0-1 for reveal
  revealDirection?: "left-to-right" | "right-to-left";
  width?: number | string;
  height?: number | string;
  className?: string;
};

const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

export const SplitScreenCore: FC<SplitScreenCoreProps> = ({
  leftContent,
  rightContent,
  progress,
  revealDirection = "left-to-right",
  width = "100%",
  height = "100%",
  className,
}) => {
  const effectiveSplit = revealDirection === "right-to-left" ? 1 - progress : progress;
  const splitPercent = clamp(effectiveSplit, 0, 1) * 100;

  const glowOpacity = clamp(1 - Math.abs(progress - 0.5) * 2, 0.2, 1);

  return (
    <div
      className={className}
      style={{
        width,
        height,
        background: COLORS.darkBg,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Left side */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          clipPath: `inset(0 ${100 - splitPercent}% 0 0)`,
        }}
      >
        {leftContent}
      </div>

      {/* Right side */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          clipPath: `inset(0 0 0 ${splitPercent}%)`,
        }}
      >
        {rightContent}
      </div>

      {/* Divider line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: `${splitPercent}%`,
          width: 3,
          background: COLORS.cyan,
          boxShadow: `0 0 ${12 * glowOpacity}px ${COLORS.cyan}, 0 0 ${24 * glowOpacity}px ${COLORS.cyan}60`,
          transform: "translateX(-50%)",
          zIndex: 10,
        }}
      />
    </div>
  );
}
