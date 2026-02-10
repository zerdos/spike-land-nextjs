import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BrowserFrame, YouTubePlayer, BridgeMindLogo } from "../../components";
import { SPRING_CONFIGS, COLORS } from "../../lib/constants";
import { useFormat, formatValue } from "../../lib/format-context";

const EC = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

export const Scene02_Algorithm: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const format = useFormat();

  const upProgress = spring({
    frame,
    fps,
    config: SPRING_CONFIGS.snappy,
  });

  const zoomProgress = interpolate(frame, [45, 105], [0, 1], EC);
  const scale = interpolate(zoomProgress, [0, 1], [1, 3.5]);

  const browserPadding = formatValue(format, { landscape: 100, portrait: 30, square: 50 });
  const logoSize = formatValue(format, { landscape: 320, portrait: 200, square: 240 });
  const taglineSize = formatValue(format, { landscape: 64, portrait: 42, square: 48 });

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
          padding: browserPadding
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
          <div style={{ transform: `scale(${interpolate(frame, [105, 160], [0.8, 1.2], EC)})`, textAlign: "center" }}>
            <BridgeMindLogo size={logoSize} />
            <div
              style={{
                marginTop: formatValue(format, { landscape: 40, portrait: 24, square: 30 }),
                fontSize: taglineSize,
                fontWeight: 700,
                color: "white",
                textAlign: "center",
                padding: formatValue(format, { landscape: 0, portrait: 20, square: 10 }),
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
