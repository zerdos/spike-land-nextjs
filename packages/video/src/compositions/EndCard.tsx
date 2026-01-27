import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientMesh } from "../components/branding/GradientMesh";
import { pulse, stagger } from "../lib/animations";
import { COLORS, SPRING_CONFIGS } from "../lib/constants";

/**
 * Scene 4: End Card (360-450 frames / 12-15 seconds)
 *
 * Shows the spike.land landing page with Orbit branding.
 * Features zoom reveal animation with URL badge and feature pills.
 */
export function EndCard() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Landing page zoom reveal
  const zoomProgress = spring({
    frame,
    fps,
    config: SPRING_CONFIGS.smooth,
  });

  const scale = interpolate(zoomProgress, [0, 1], [1.1, 1]);
  const opacity = interpolate(zoomProgress, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  // URL badge animation
  const urlDelay = 30;
  const urlProgress = spring({
    frame: frame - urlDelay,
    fps,
    config: SPRING_CONFIGS.bouncy,
  });

  // Glow pulse
  const glowPulse = pulse(frame, fps, 1.5);

  return (
    <AbsoluteFill>
      {/* Animated gradient background */}
      <GradientMesh animationSpeed={0.008} />

      {/* Landing page preview mockup */}
      <AbsoluteFill
        style={{
          opacity,
          transform: `scale(${scale})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
        }}
      >
        <LandingPagePreview />
      </AbsoluteFill>

      {/* Vignette overlay */}
      <AbsoluteFill
        style={{
          background:
            `radial-gradient(ellipse at center, transparent 50%, ${COLORS.darkBg}95 100%)`,
          pointerEvents: "none",
        }}
      />

      {/* URL badge at bottom */}
      <Sequence from={urlDelay}>
        <URLBadge progress={urlProgress} glowPulse={glowPulse} />
      </Sequence>

      {/* Feature pills */}
      <Sequence from={50}>
        <FeaturePills />
      </Sequence>
    </AbsoluteFill>
  );
}

/**
 * Landing page preview - shows a mockup of the Orbit landing page
 */
function LandingPagePreview() {
  return (
    <div
      style={{
        width: "90%",
        maxWidth: 1000,
        backgroundColor: COLORS.darkBg,
        borderRadius: 24,
        border: `1px solid ${COLORS.darkBorder}`,
        overflow: "hidden",
        boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
      }}
    >
      {/* Browser chrome */}
      <div
        style={{
          padding: "12px 16px",
          backgroundColor: COLORS.darkBorder,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#ff5f56" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#ffbd2e" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#27ca3f" }} />
        </div>
        <div
          style={{
            flex: 1,
            backgroundColor: COLORS.darkBg,
            borderRadius: 6,
            padding: "8px 16px",
            fontSize: 14,
            color: COLORS.textMuted,
            fontFamily: "Inter, sans-serif",
          }}
        >
          spike.land
        </div>
      </div>

      {/* Landing page content mockup */}
      <div
        style={{
          padding: 40,
          background: `linear-gradient(180deg, ${COLORS.darkBg} 0%, #0a0a14 100%)`,
          minHeight: 400,
        }}
      >
        {/* Hero section mockup */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          {/* Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 16px",
              backgroundColor: `${COLORS.cyan}15`,
              borderRadius: 20,
              border: `1px solid ${COLORS.cyan}30`,
              marginBottom: 20,
            }}
          >
            <span style={{ fontSize: 14 }}>⚡</span>
            <span
              style={{
                fontSize: 12,
                color: COLORS.cyan,
                fontFamily: "Inter, sans-serif",
              }}
            >
              AI-Powered Social Media Management
            </span>
          </div>

          {/* Headline */}
          <div
            style={{
              fontSize: 42,
              fontWeight: 700,
              fontFamily: "Inter, sans-serif",
              marginBottom: 16,
            }}
          >
            <span style={{ color: COLORS.textPrimary }}>Your Social</span>
            <br />
            <span
              style={{
                background: `linear-gradient(135deg, ${COLORS.cyan}, ${COLORS.purple})`,
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              Command Center
            </span>
          </div>

          {/* Subheadline */}
          <div
            style={{
              fontSize: 16,
              color: COLORS.textMuted,
              fontFamily: "Inter, sans-serif",
              maxWidth: 500,
              margin: "0 auto",
              lineHeight: 1.5,
            }}
          >
            Connect every platform. Automate with AI. Grow without limits.
          </div>
        </div>

        {/* Platform icons row */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 16,
            marginTop: 24,
          }}
        >
          {["IG", "FB", "X", "LI", "TT"].map((platform) => (
            <div
              key={platform}
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                backgroundColor: `${COLORS.darkCard}80`,
                border: `1px solid ${COLORS.darkBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 600,
                color: COLORS.textSecondary,
                fontFamily: "Inter, sans-serif",
              }}
            >
              {platform}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type URLBadgeProps = {
  progress: number;
  glowPulse: number;
};

function URLBadge({ progress, glowPulse }: URLBadgeProps) {
  const opacity = interpolate(progress, [0, 1], [0, 1], {
    extrapolateRight: "clamp",
  });
  const translateY = interpolate(progress, [0, 1], [20, 0]);
  const scale = interpolate(progress, [0, 1], [0.9, 1]);

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        paddingBottom: 100,
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${translateY}px) scale(${scale})`,
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 600,
            fontFamily: "Inter, sans-serif",
            color: COLORS.textPrimary,
            padding: "14px 40px",
            background: `linear-gradient(135deg, ${COLORS.darkCard}ee, ${COLORS.darkBg}ee)`,
            borderRadius: 16,
            border: `1px solid ${COLORS.darkBorder}`,
            boxShadow: `0 0 ${30 + glowPulse * 15}px ${COLORS.cyan}40`,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ color: COLORS.cyan }}>🌐</span>
          <span>
            spike
            <span style={{ color: COLORS.amber }}>.land</span>
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
}

function FeaturePills() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Updated features to reflect Orbit ecosystem
  const features = [
    { icon: "📊", text: "Pulse Analytics" },
    { icon: "✉️", text: "Relay Drafts" },
    { icon: "⚙️", text: "Allocator Autopilot" },
    { icon: "🤖", text: "AI Agents" },
  ];

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        paddingBottom: 30,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          justifyContent: "center",
          maxWidth: 800,
        }}
      >
        {features.map((feature, index) => {
          const delay = stagger(index, 6);
          const progress = spring({
            frame: frame - delay,
            fps,
            config: SPRING_CONFIGS.snappy,
          });

          const opacity = interpolate(progress, [0, 1], [0, 1], {
            extrapolateRight: "clamp",
          });
          const translateY = interpolate(progress, [0, 1], [10, 0]);
          const scale = interpolate(progress, [0, 1], [0.9, 1]);

          return (
            <div
              key={feature.text}
              style={{
                opacity,
                transform: `translateY(${translateY}px) scale(${scale})`,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 20px",
                backgroundColor: `${COLORS.darkCard}90`,
                borderRadius: 24,
                border: `1px solid ${COLORS.darkBorder}`,
              }}
            >
              <span style={{ fontSize: 16 }}>{feature.icon}</span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: COLORS.textSecondary,
                  fontFamily: "Inter, sans-serif",
                }}
              >
                {feature.text}
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}
