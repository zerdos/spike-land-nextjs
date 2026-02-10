import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BrowserFrame, YouTubePlayer, BridgeMindLogo } from "../../components";
import { SPRING_CONFIGS, COLORS } from "../../lib/constants";

const EC = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

export const Scene02_Algorithm: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();

  const upProgress = spring({
    frame,
    fps,
    config: SPRING_CONFIGS.snappy,
  });

  const zoomProgress = interpolate(frame, [45, 105], [0, 1], EC);
  const scale = interpolate(zoomProgress, [0, 1], [1, 3.5]);

  return (
    <AbsoluteFill style={{ background: COLORS.darkBg, overflow: "hidden" }}>
      <div
        style={{
          transform: `translateY(${interpolate(upProgress, [0, 1], [height, 0], EC)}px) scale(${scale})`,
          opacity: interpolate(frame, [0, 15, 80, 105], [0, 1, 1, 0], EC),
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 100
        }}
      >
        <BrowserFrame>
          <YouTubePlayer delay={15} />
        </BrowserFrame>
      </div>

      {/* Reveal BridgeMind after zoom */}
      {frame > 90 && (
        <AbsoluteFill
          style={{
            background: "#000",
            opacity: interpolate(frame, [90, 105], [0, 1], EC),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              backgroundImage: "radial-gradient(circle, #1e293b 1px, transparent 1px)",
              backgroundSize: "40px 40px",
              opacity: 0.3
            }}
          />
          <div style={{ transform: `scale(${interpolate(frame, [105, 180], [0.8, 1.2], EC)})` }}>
            <BridgeMindLogo size={320} />
            <div
              style={{
                marginTop: 40,
                fontSize: 64,
                fontWeight: 700,
                color: "white",
                textAlign: "center",
                background: `linear-gradient(to right, ${COLORS.bridgemindCyan}, ${COLORS.bridgemindPink})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Ship Software at the Speed of Thought
            </div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
