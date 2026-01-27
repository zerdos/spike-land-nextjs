import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientMesh } from "../components/branding/GradientMesh";
import { NoiseOverlay, ScanLines } from "../components/effects/GlitchTransition";
import { GlitchText, TextMorph } from "../components/ui/GlitchText";
import { glitchOffset, pulse } from "../lib/animations";
import { COLORS, SPRING_CONFIGS } from "../lib/constants";

/**
 * Scene 3: Live Update with Glitch Transition (240-360 frames / 8-12 seconds)
 *
 * Shows the Orbit dashboard transforming from basic to full-featured.
 * Before/after comparison with RGB split, scan lines, and dramatic effects.
 */
export function LiveUpdate() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Timing for the glitch effect
  const glitchStart = 30;
  const glitchDuration = 25;
  const glitchEnd = glitchStart + glitchDuration;

  // Calculate glitch intensity
  const isGlitching = frame >= glitchStart && frame <= glitchEnd;
  const glitchProgress = isGlitching
    ? (frame - glitchStart) / glitchDuration
    : 0;
  const glitchIntensity = isGlitching
    ? Math.sin(glitchProgress * Math.PI) // Peak in middle
    : 0;

  // Content transition
  const showNewContent = frame > glitchEnd;
  const contentProgress = interpolate(
    frame,
    [glitchStart, glitchEnd + 10],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Deployed badge animation
  const deployedProgress = spring({
    frame: frame - glitchEnd - 15,
    fps,
    config: SPRING_CONFIGS.bouncy,
  });

  return (
    <AbsoluteFill>
      {/* Background */}
      <GradientMesh animationSpeed={0.015} />

      {/* Main browser frame */}
      <AbsoluteFill
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: 60,
        }}
      >
        <div
          style={{
            width: 1200,
            backgroundColor: `${COLORS.darkCard}ee`,
            borderRadius: 20,
            border: `1px solid ${COLORS.darkBorder}`,
            overflow: "hidden",
            boxShadow: isGlitching
              ? `0 0 ${40 * glitchIntensity}px ${COLORS.fuchsia}60, 0 0 ${
                60 * glitchIntensity
              }px ${COLORS.cyan}40`
              : "0 20px 60px rgba(0,0,0,0.5)",
          }}
        >
          {/* Browser chrome */}
          <BrowserChrome isGlitching={isGlitching} />

          {/* Page content with glitch effect */}
          <div
            style={{
              position: "relative",
              height: 500,
              background: `linear-gradient(180deg, ${COLORS.darkBg} 0%, #0a0a18 100%)`,
              overflow: "hidden",
            }}
          >
            {/* Glitch layers */}
            {isGlitching && (
              <>
                <GlitchLayer
                  offset={glitchOffset(frame, 8, 0)}
                  color="rgba(255, 0, 255, 0.3)"
                />
                <GlitchLayer
                  offset={glitchOffset(frame, 8, 100)}
                  color="rgba(0, 255, 255, 0.3)"
                />
                <ScanLines opacity={0.15 * glitchIntensity} />
                <NoiseOverlay opacity={0.1 * glitchIntensity} frame={frame} />
              </>
            )}

            {/* Orbit dashboard content */}
            <OrbitDashboardContent
              showNew={showNewContent}
              transitionProgress={contentProgress}
              isGlitching={isGlitching}
              frame={frame}
            />

            {/* Deployed badge */}
            <Sequence from={glitchEnd + 15}>
              <DeployedBadge progress={deployedProgress} />
            </Sequence>
          </div>
        </div>
      </AbsoluteFill>

      {/* Dramatic scan line overlay during glitch */}
      {isGlitching && (
        <AbsoluteFill>
          <ScanLines opacity={0.08 * glitchIntensity} gap={2} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}

type BrowserChromeProps = {
  isGlitching: boolean;
};

function BrowserChrome({ isGlitching }: BrowserChromeProps) {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        padding: "14px 20px",
        backgroundColor: COLORS.darkBorder,
        display: "flex",
        alignItems: "center",
        gap: 16,
        transform: isGlitching
          ? `translateX(${glitchOffset(frame, 3, 50)}px)`
          : "none",
      }}
    >
      <div style={{ display: "flex", gap: 8 }}>
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            backgroundColor: "#ff5f56",
          }}
        />
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            backgroundColor: "#ffbd2e",
          }}
        />
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            backgroundColor: "#27ca3f",
          }}
        />
      </div>

      <div
        style={{
          flex: 1,
          backgroundColor: COLORS.darkBg,
          borderRadius: 8,
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ color: COLORS.success, fontSize: 14 }}>🔒</span>
        <span
          style={{
            fontSize: 14,
            color: COLORS.textMuted,
            fontFamily: "Inter, sans-serif",
          }}
        >
          spike.land/orbit/pulse
        </span>
      </div>

      {/* Refresh indicator during glitch */}
      {isGlitching && (
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            border: `2px solid ${COLORS.cyan}`,
            borderTopColor: "transparent",
            transform: `rotate(${frame * 20}deg)`,
          }}
        />
      )}
    </div>
  );
}

type GlitchLayerProps = {
  offset: number;
  color: string;
};

function GlitchLayer({ offset, color }: GlitchLayerProps) {
  return (
    <AbsoluteFill
      style={{
        transform: `translateX(${offset}px)`,
        backgroundColor: color,
        mixBlendMode: "screen",
        clipPath: `polygon(0 ${30 + offset}%, 100% ${30 - offset}%, 100% ${70 + offset}%, 0 ${
          70 - offset
        }%)`,
      }}
    />
  );
}

type OrbitDashboardContentProps = {
  showNew: boolean;
  transitionProgress: number;
  isGlitching: boolean;
  frame: number;
};

function OrbitDashboardContent({
  showNew,
  transitionProgress,
  isGlitching,
  frame,
}: OrbitDashboardContentProps) {
  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        padding: 32,
        transform: isGlitching
          ? `translateX(${glitchOffset(frame, 5, 25)}px)`
          : "none",
      }}
    >
      {/* Dashboard Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: `linear-gradient(135deg, ${COLORS.success}, #059669)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              transform: isGlitching
                ? `scale(${1 + Math.sin(frame * 0.5) * 0.05})`
                : "none",
            }}
          >
            📊
          </div>
          <div>
            {/* Title with morph effect */}
            <div style={{ position: "relative" }}>
              {isGlitching
                ? (
                  <GlitchText
                    text={showNew ? "Pulse Dashboard" : "Basic Metrics"}
                    fontSize={28}
                    glitchIntensity={6}
                    isGlitching={true}
                  />
                )
                : (
                  <TextMorph
                    fromText="Basic Metrics"
                    toText="Pulse Dashboard"
                    progress={transitionProgress}
                    fontSize={28}
                  />
                )}
            </div>
            <div
              style={{
                fontSize: 14,
                color: COLORS.textSecondary,
                fontFamily: "Inter, sans-serif",
                opacity: isGlitching ? 0.7 : 1,
              }}
            >
              {showNew ? "Full-featured health monitoring" : "Limited analytics view"}
            </div>
          </div>
        </div>

        {/* Autopilot toggle - only visible in new version */}
        {showNew && !isGlitching && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              backgroundColor: `${COLORS.cyan}20`,
              borderRadius: 20,
              border: `1px solid ${COLORS.cyan}40`,
              opacity: interpolate(transitionProgress, [0.5, 1], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            <span style={{ fontSize: 14 }}>⚡</span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: COLORS.cyan,
                fontFamily: "Inter, sans-serif",
              }}
            >
              Autopilot ON
            </span>
          </div>
        )}
      </div>

      {/* Platform Status Grid */}
      <PlatformGrid showNew={showNew} isGlitching={isGlitching} />

      {/* Metrics Chart */}
      <div style={{ flex: 1, marginTop: 20 }}>
        <MetricsChart showNew={showNew} isGlitching={isGlitching} />
      </div>

      {/* Recommendations Panel - only in new version */}
      {showNew && !isGlitching && (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            backgroundColor: `${COLORS.amber}10`,
            borderRadius: 12,
            border: `1px solid ${COLORS.amber}30`,
            display: "flex",
            alignItems: "center",
            gap: 12,
            opacity: interpolate(transitionProgress, [0.7, 1], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <span style={{ fontSize: 20 }}>💡</span>
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: COLORS.amber,
                fontFamily: "Inter, sans-serif",
              }}
            >
              AI Recommendation
            </div>
            <div
              style={{
                fontSize: 12,
                color: COLORS.textSecondary,
                fontFamily: "Inter, sans-serif",
              }}
            >
              Based on anomaly analysis: Post at 2PM for optimal engagement recovery
            </div>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
}

type PlatformGridProps = {
  showNew: boolean;
  isGlitching: boolean;
};

function PlatformGrid({ showNew, isGlitching }: PlatformGridProps) {
  const basicPlatforms = [
    { name: "Instagram", value: "24.5K" },
    { name: "Facebook", value: "18.2K" },
    { name: "Twitter", value: "9.8K" },
  ];

  const fullPlatforms = [
    { name: "Instagram", value: "24.5K", change: "+12%", color: "#E4405F" },
    { name: "Facebook", value: "18.2K", change: "+8%", color: "#1877F2" },
    { name: "Twitter/X", value: "9.8K", change: "-3%", color: "#9CA3AF" },
    { name: "LinkedIn", value: "12.1K", change: "+15%", color: "#0A66C2" },
    { name: "TikTok", value: "45.3K", change: "+28%", color: "#00F2EA" },
  ];

  const platforms = showNew ? fullPlatforms : basicPlatforms;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: showNew ? "repeat(5, 1fr)" : "repeat(3, 1fr)",
        gap: 12,
        opacity: isGlitching ? 0.7 : 1,
      }}
    >
      {platforms.map((platform) => (
        <div
          key={platform.name}
          style={{
            padding: 16,
            backgroundColor: `${COLORS.darkBg}80`,
            borderRadius: 10,
            border: `1px solid ${COLORS.darkBorder}`,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "color" in platform ? platform.color : COLORS.textMuted,
              marginBottom: 8,
              fontFamily: "Inter, sans-serif",
            }}
          >
            {platform.name}
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: COLORS.textPrimary,
              fontFamily: "Inter, sans-serif",
            }}
          >
            {platform.value}
          </div>
          {"change" in platform && (
            <div
              style={{
                fontSize: 12,
                color: platform.change.startsWith("+") ? COLORS.success : "#EF4444",
                fontFamily: "Inter, sans-serif",
                marginTop: 4,
              }}
            >
              {platform.change}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

type MetricsChartProps = {
  showNew: boolean;
  isGlitching: boolean;
};

function MetricsChart({ showNew, isGlitching }: MetricsChartProps) {
  const data = [75, 82, 78, 88, 42, 65, 72];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: `${COLORS.darkBg}60`,
        borderRadius: 12,
        padding: 20,
        opacity: isGlitching ? 0.7 : 1,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: COLORS.textPrimary,
            fontFamily: "Inter, sans-serif",
          }}
        >
          {showNew ? "Engagement Trends (7 days)" : "Basic Metrics"}
        </div>
        {showNew && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "#EF4444",
              fontSize: 12,
              fontFamily: "Inter, sans-serif",
            }}
          >
            <span>📉</span>
            <span style={{ fontWeight: 600 }}>Anomaly detected</span>
          </div>
        )}
      </div>

      {/* Chart bars */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 8,
          height: showNew ? 140 : 80,
        }}
      >
        {data.map((value, index) => {
          const isAnomaly = index === 4;
          return (
            <div
              key={days[index]}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  width: "80%",
                  height: `${showNew ? value : value * 0.5}%`,
                  backgroundColor: isAnomaly && showNew ? "#EF4444" : COLORS.success,
                  borderRadius: 4,
                  opacity: 0.8,
                }}
              />
              {showNew && (
                <span
                  style={{
                    fontSize: 10,
                    color: isAnomaly ? COLORS.amber : COLORS.textMuted,
                    fontFamily: "Inter, sans-serif",
                    fontWeight: isAnomaly ? 600 : 400,
                  }}
                >
                  {days[index]}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

type DeployedBadgeProps = {
  progress: number;
};

function DeployedBadge({ progress }: DeployedBadgeProps) {
  const frame = useCurrentFrame();
  const glowPulse = pulse(frame, 30, 2);

  const scale = interpolate(progress, [0, 1], [0.5, 1]);
  const opacity = interpolate(progress, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 24,
        right: 24,
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 20px",
          backgroundColor: `${COLORS.success}20`,
          borderRadius: 10,
          border: `2px solid ${COLORS.success}`,
          boxShadow: `0 0 ${20 + glowPulse * 15}px ${COLORS.success}50`,
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            backgroundColor: COLORS.success,
            boxShadow: `0 0 8px ${COLORS.success}`,
          }}
        />
        <span
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: COLORS.success,
            fontFamily: "Inter, sans-serif",
            letterSpacing: "0.05em",
          }}
        >
          UPGRADED
        </span>
      </div>
    </div>
  );
}
