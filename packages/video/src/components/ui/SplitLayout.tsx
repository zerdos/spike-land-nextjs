import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, SPRING_CONFIGS } from "../../lib/constants";

type SplitLayoutProps = {
  leftContent: React.ReactNode;
  rightContent: React.ReactNode;
  leftLabel?: string;
  rightLabel?: string;
  splitRatio?: number; // 0-1, default 0.5
  delay?: number;
  dividerGlow?: boolean;
};

/**
 * Reusable split-screen layout for chat and comparison scenes
 */
export function SplitLayout({
  leftContent,
  rightContent,
  leftLabel,
  rightLabel,
  splitRatio = 0.5,
  delay = 0,
  dividerGlow = true,
}: SplitLayoutProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entryProgress = spring({
    frame: frame - delay,
    fps,
    config: SPRING_CONFIGS.smooth,
  });

  const leftOpacity = interpolate(entryProgress, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  const rightOpacity = interpolate(entryProgress, [0.2, 0.7], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const dividerOpacity = interpolate(entryProgress, [0.1, 0.4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const leftWidth = `${splitRatio * 100}%`;
  const rightWidth = `${(1 - splitRatio) * 100}%`;

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        position: "relative",
      }}
    >
      {/* Left panel */}
      <div
        style={{
          width: leftWidth,
          height: "100%",
          opacity: leftOpacity,
          display: "flex",
          flexDirection: "column",
          padding: 40,
          position: "relative",
        }}
      >
        {leftLabel && (
          <div
            style={{
              position: "absolute",
              top: 20,
              left: 40,
              fontSize: 14,
              fontWeight: 600,
              color: COLORS.textMuted,
              fontFamily: "Inter, sans-serif",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            {leftLabel}
          </div>
        )}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          {leftContent}
        </div>
      </div>

      {/* Divider */}
      <div
        style={{
          width: 2,
          height: "100%",
          background: dividerGlow
            ? `linear-gradient(180deg, transparent, ${COLORS.cyan}60, transparent)`
            : COLORS.darkBorder,
          opacity: dividerOpacity,
          position: "relative",
        }}
      >
        {dividerGlow && (
          <div
            style={{
              position: "absolute",
              inset: "-10px -20px",
              background: `linear-gradient(180deg, transparent, ${COLORS.cyan}20, transparent)`,
              filter: "blur(10px)",
            }}
          />
        )}
      </div>

      {/* Right panel */}
      <div
        style={{
          width: rightWidth,
          height: "100%",
          opacity: rightOpacity,
          display: "flex",
          flexDirection: "column",
          padding: 40,
          position: "relative",
        }}
      >
        {rightLabel && (
          <div
            style={{
              position: "absolute",
              top: 20,
              right: 40,
              fontSize: 14,
              fontWeight: 600,
              color: COLORS.textMuted,
              fontFamily: "Inter, sans-serif",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            {rightLabel}
          </div>
        )}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          {rightContent}
        </div>
      </div>
    </div>
  );
}

type BeforeAfterProps = {
  beforeContent: React.ReactNode;
  afterContent: React.ReactNode;
  beforeLabel?: string;
  afterLabel?: string;
  delay?: number;
  revealDelay?: number; // Additional delay before "after" side reveals
};

/**
 * Before/After comparison layout with staggered reveal
 */
export function BeforeAfterLayout({
  beforeContent,
  afterContent,
  beforeLabel = "Before",
  afterLabel = "After",
  delay = 0,
  revealDelay = 30,
}: BeforeAfterProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const beforeProgress = spring({
    frame: frame - delay,
    fps,
    config: SPRING_CONFIGS.smooth,
  });

  const afterProgress = spring({
    frame: frame - delay - revealDelay,
    fps,
    config: SPRING_CONFIGS.smooth,
  });

  const beforeOpacity = interpolate(beforeProgress, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  const afterOpacity = interpolate(afterProgress, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  const dividerX = interpolate(afterProgress, [0, 1], [100, 0]);

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        position: "relative",
        gap: 40,
        padding: 60,
      }}
    >
      {/* Before panel */}
      <div
        style={{
          flex: 1,
          opacity: beforeOpacity,
          backgroundColor: `${COLORS.darkCard}dd`,
          borderRadius: 20,
          border: `1px solid ${COLORS.darkBorder}`,
          padding: 32,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: COLORS.error,
            fontFamily: "Inter, sans-serif",
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>📉</span>
          {beforeLabel}
        </div>
        {beforeContent}
      </div>

      {/* After panel */}
      <div
        style={{
          flex: 1,
          opacity: afterOpacity,
          transform: `translateX(${dividerX}px)`,
          backgroundColor: `${COLORS.darkCard}dd`,
          borderRadius: 20,
          border: `2px solid ${COLORS.success}40`,
          padding: 32,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: `0 0 30px ${COLORS.success}20`,
        }}
      >
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: COLORS.success,
            fontFamily: "Inter, sans-serif",
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>📈</span>
          {afterLabel}
        </div>
        {afterContent}
      </div>
    </div>
  );
}
