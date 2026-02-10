import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../../lib/constants";

type YouTubePlayerProps = {
  title?: string;
  channel?: string;
  _thumbnail?: string;
  delay?: number;
};

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  title = "Building the Missing Bridge for AI Agents",
  channel = "Vibe Coding Creator",
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps: _fps } = useVideoConfig();

  const progress = Math.min(1, Math.max(0, (frame - delay) / 90));

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#0f0f0f",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Roboto, sans-serif",
      }}
    >
      {/* Main Video Area */}
      <div
        style={{
          flex: 1,
          background: "#000",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "linear-gradient(45deg, #1a1a1a, #2a2a2a)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Mock Video Content - BridgeMind Logo */}
          <div style={{ transform: "scale(1.5)" }}>
            <div style={{ color: "#fff", fontSize: 48, fontWeight: 900 }}>BridgeMind</div>
            <div style={{ color: COLORS.bridgemindCyan, fontSize: 14, textAlign: "center", letterSpacing: 4 }}>D O T  A I</div>
          </div>
        </div>

        {/* Video Controls Overlay */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 60,
            background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
            padding: "0 20px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 12,
          }}
        >
          {/* Progress Bar */}
          <div style={{ height: 4, background: "rgba(255,255,255,0.2)", position: "relative" }}>
            <div
              style={{
                height: "100%",
                width: `${progress * 100}%`,
                background: "#ff0000",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: -4,
                left: `${progress * 100}%`,
                width: 12,
                height: 12,
                background: "#ff0000",
                borderRadius: "50%",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            <div style={{ width: 14, height: 14, background: "#fff", borderRadius: 2 }} />
            <div style={{ width: 14, height: 14, borderLeft: "10px solid #fff", borderTop: "7px solid transparent", borderBottom: "7px solid transparent" }} />
          </div>
        </div>
      </div>

      {/* Video Info Section */}
      <div style={{ padding: "20px 24px" }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 8 }}>{title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#888" }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 500, color: "#fff" }}>{channel}</div>
            <div style={{ fontSize: 14, color: "#aaa" }}>1.2M views • 1 day ago</div>
          </div>
          <div
            style={{
              marginLeft: "auto",
              background: "#fff",
              color: "#000",
              padding: "8px 20px",
              borderRadius: 20,
              fontWeight: 700,
            }}
          >
            Subscribe
          </div>
        </div>
      </div>
    </div>
  );
};
