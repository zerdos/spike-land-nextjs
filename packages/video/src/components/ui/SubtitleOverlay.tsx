import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../../lib/constants";
import { getSegmentAtFrame } from "../../lib/transcript";

export function SubtitleOverlay() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const segment = getSegmentAtFrame(frame, fps);

  if (!segment) return null;

  const isSpeaker0 = segment.speaker.id === "speaker_0";
  const speakerColor = isSpeaker0 ? COLORS.cyan : COLORS.fuchsia;
  const speakerLabel = isSpeaker0 ? "HOST" : "EXPERT";

  // Crossfade logic
  const startFrame = segment.start_time * fps;
  const endFrame = segment.end_time * fps;
  
  const opacity = interpolate(
    frame,
    [startFrame, startFrame + 5, endFrame - 5, endFrame],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        position: "absolute",
        bottom: 80,
        left: "50%",
        transform: "translateX(-50%)",
        width: "90%",
        height: "140px",
        backgroundColor: "rgba(10, 10, 15, 0.8)",
        backdropFilter: "blur(12px)",
        padding: "20px 60px",
        borderRadius: "24px",
        border: `1px solid ${speakerColor}40`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        zIndex: 1000,
        opacity,
        boxShadow: `0 20px 50px rgba(0, 0, 0, 0.5), inset 0 0 20px ${speakerColor}10`,
      }}
    >
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
            backgroundColor: speakerColor,
            boxShadow: `0 0 12px ${speakerColor}`,
          }}
        />
        <span
          style={{
            color: speakerColor,
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: "2px",
            fontFamily: "Inter, sans-serif",
            textTransform: "uppercase",
          }}
        >
          {speakerLabel}
        </span>
      </div>
      <div
        style={{
          color: "white",
          fontSize: 32,
          textAlign: "center",
          fontFamily: "Inter, sans-serif",
          lineHeight: "1.3",
          fontWeight: 500,
          maxWidth: "100%",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {segment.text}
      </div>
    </div>
  );
}
