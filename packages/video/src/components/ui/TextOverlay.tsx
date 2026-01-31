import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, SPRING_CONFIGS } from "../../lib/constants";

type TextOverlayProps = {
  text: string;
  subtext?: string;
  delay?: number;
  position?: "center" | "bottom" | "top";
  size?: "small" | "medium" | "large";
  gradient?: boolean;
};

/**
 * Reusable text overlay for story beats
 * Provides centered, styled text with entry/exit animations
 */
export function TextOverlay({
  text,
  subtext,
  delay = 0,
  position = "center",
  size = "medium",
  gradient = false,
}: TextOverlayProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entryProgress = spring({
    frame: frame - delay,
    fps,
    config: SPRING_CONFIGS.smooth,
  });

  const opacity = interpolate(entryProgress, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  const translateY = interpolate(entryProgress, [0, 1], [30, 0]);
  const scale = interpolate(entryProgress, [0, 1], [0.95, 1]);

  const fontSize = {
    small: 28,
    medium: 42,
    large: 56,
  }[size];

  const subtextSize = {
    small: 16,
    medium: 20,
    large: 24,
  }[size];

  const positionStyles: Record<string, React.CSSProperties> = {
    center: {
      top: "50%",
      left: "50%",
      transform: `translate(-50%, -50%) translateY(${translateY}px) scale(${scale})`,
    },
    bottom: {
      bottom: 120,
      left: "50%",
      transform: `translateX(-50%) translateY(${translateY}px) scale(${scale})`,
    },
    top: {
      top: 120,
      left: "50%",
      transform: `translateX(-50%) translateY(${translateY}px) scale(${scale})`,
    },
  };

  return (
    <div
      style={{
        position: "absolute",
        ...positionStyles[position],
        opacity,
        textAlign: "center",
        zIndex: 100,
      }}
    >
      {/* Background blur/gradient */}
      <div
        style={{
          position: "absolute",
          inset: -40,
          background: `radial-gradient(ellipse at center, ${COLORS.darkBg}ee 0%, transparent 70%)`,
          borderRadius: 20,
          zIndex: -1,
        }}
      />

      {/* Main text */}
      <div
        style={{
          fontSize,
          fontWeight: 700,
          fontFamily: "Inter, sans-serif",
          lineHeight: 1.2,
          ...(gradient
            ? {
              background: `linear-gradient(135deg, ${COLORS.cyan}, ${COLORS.purple})`,
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }
            : {
              color: COLORS.textPrimary,
            }),
        }}
      >
        {text}
      </div>

      {/* Subtext */}
      {subtext && (
        <div
          style={{
            fontSize: subtextSize,
            color: COLORS.textSecondary,
            fontFamily: "Inter, sans-serif",
            marginTop: 16,
            fontWeight: 400,
          }}
        >
          {subtext}
        </div>
      )}
    </div>
  );
}

type TypedTextOverlayProps = {
  text: string;
  delay?: number;
  position?: "center" | "bottom" | "top";
  size?: "small" | "medium" | "large";
  charsPerSecond?: number;
};

/**
 * Text overlay with typewriter effect
 */
export function TypedTextOverlay({
  text,
  delay = 0,
  position = "center",
  size = "medium",
  charsPerSecond = 30,
}: TypedTextOverlayProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entryProgress = spring({
    frame: frame - delay,
    fps,
    config: SPRING_CONFIGS.smooth,
  });

  const opacity = interpolate(entryProgress, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Typewriter effect
  const elapsedFrames = Math.max(0, frame - delay - 10);
  const elapsedSeconds = elapsedFrames / fps;
  const visibleChars = Math.floor(elapsedSeconds * charsPerSecond);
  const visibleText = text.slice(0, visibleChars);
  const isTyping = visibleChars < text.length;

  const fontSize = {
    small: 28,
    medium: 42,
    large: 56,
  }[size];

  const positionStyles: Record<string, React.CSSProperties> = {
    center: {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    },
    bottom: {
      bottom: 120,
      left: "50%",
      transform: "translateX(-50%)",
    },
    top: {
      top: 120,
      left: "50%",
      transform: "translateX(-50%)",
    },
  };

  return (
    <div
      style={{
        position: "absolute",
        ...positionStyles[position],
        opacity,
        textAlign: "center",
        zIndex: 100,
      }}
    >
      {/* Background blur */}
      <div
        style={{
          position: "absolute",
          inset: -40,
          background: `radial-gradient(ellipse at center, ${COLORS.darkBg}ee 0%, transparent 70%)`,
          borderRadius: 20,
          zIndex: -1,
        }}
      />

      <div
        style={{
          fontSize,
          fontWeight: 600,
          fontFamily: "Inter, sans-serif",
          color: COLORS.textPrimary,
        }}
      >
        {visibleText}
        {isTyping && (
          <span
            style={{
              opacity: Math.sin(frame * 0.3) > 0 ? 1 : 0,
              color: COLORS.cyan,
            }}
          >
            |
          </span>
        )}
      </div>
    </div>
  );
}
