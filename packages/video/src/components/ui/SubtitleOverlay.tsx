import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../../lib/constants";

type SubtitleOverlayProps = {
  text: string;
  startFrame?: number;
  endFrame?: number;
  color?: string;
  label?: string;
};

export function SubtitleOverlay({
  text,
  startFrame = 0,
  endFrame = 300,
  color = COLORS.cyan,
  label,
}: SubtitleOverlayProps) {
  const frame = useCurrentFrame();
  const { fps: _fps } = useVideoConfig();

  const duration = endFrame - startFrame;

  const opacity = duration <= 12
    ? interpolate(
        frame,
        [startFrame, (startFrame + endFrame) / 2, endFrame],
        [0, 1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      )
    : interpolate(
        frame,
        [startFrame, startFrame + 5, endFrame - 5, endFrame],
        [0, 1, 1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );

  if (opacity <= 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 40,
        left: "50%",
        transform: "translateX(-50%)",
        width: "88%",
        maxHeight: "200px",
        backgroundColor: "rgba(10, 10, 15, 0.85)",
        backdropFilter: "blur(12px)",
        padding: "16px 50px",
        borderRadius: "20px",
        border: `1px solid ${color}40`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        zIndex: 1000,
        opacity,
        boxShadow: `0 20px 50px rgba(0, 0, 0, 0.5), inset 0 0 20px ${color}10`,
      }}
    >
      {label && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: color,
              boxShadow: `0 0 12px ${color}`,
            }}
          />
          <span
            style={{
              color,
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: "2px",
              fontFamily: "Inter, sans-serif",
              textTransform: "uppercase",
            }}
          >
            {label}
          </span>
        </div>
      )}
      <div
        style={{
          color: "white",
          fontSize: 26,
          textAlign: "center",
          fontFamily: "Inter, sans-serif",
          lineHeight: "1.35",
          fontWeight: 500,
          maxWidth: "100%",
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {text}
      </div>
    </div>
  );
}
