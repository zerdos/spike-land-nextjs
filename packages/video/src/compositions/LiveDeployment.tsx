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
 * Scene 6: LiveDeployment (1230-1470 frames / 41-49 seconds)
 *
 * Dramatic glitch transition showing changes going live.
 *
 * Timeline (240 frames / 8s):
 * - 0-30f: Dashboard is fully optimized, brief pause
 * - 30-60f: "Deploying..." text with loading spinner
 * - 60-120f: Glitch transition begins - RGB split, scan lines
 * - 120-150f: Peak glitch intensity
 * - 150-180f: Glitch subsides, new dashboard revealed
 * - 180-240f: "DEPLOYED" badge with celebration particles
 */
export function LiveDeployment() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Deploying text animation
  const deployingProgress = spring({
    frame: frame - 30,
    fps,
    config: SPRING_CONFIGS.smooth,
  });

  // Timing for the glitch effect
  const glitchStart = 60;
  const glitchDuration = 90; // Extended from 25 to 90 frames
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
    [glitchStart, glitchEnd + 15],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Deployed badge animation
  const deployedProgress = spring({
    frame: frame - glitchEnd - 30,
    fps,
    config: SPRING_CONFIGS.bouncy,
  });

  return (
    <AbsoluteFill>
      {/* Background */}
      <GradientMesh animationSpeed={0.015} />

      {/* Deploying status at top */}
      <Sequence from={30} durationInFrames={glitchStart}>
        <DeployingIndicator progress={deployingProgress} frame={frame - 30} />
      </Sequence>

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
              ? `0 0 ${50 * glitchIntensity}px ${COLORS.fuchsia}60, 0 0 ${
                80 * glitchIntensity
              }px ${COLORS.cyan}40`
              : "0 20px 60px rgba(0,0,0,0.5)",
          }}
        >
          {/* Browser chrome */}
          <BrowserChrome isGlitching={isGlitching} frame={frame} />

          {/* Page content with glitch effect */}
          <div
            style={{
              position: "relative",
              height: 520,
              background: `linear-gradient(180deg, ${COLORS.darkBg} 0%, #0a0a18 100%)`,
              overflow: "hidden",
            }}
          >
            {/* Glitch layers */}
            {isGlitching && (
              <>
                <GlitchLayer
                  offset={glitchOffset(frame, 10, 0)}
                  color="rgba(255, 0, 255, 0.35)"
                />
                <GlitchLayer
                  offset={glitchOffset(frame, 10, 100)}
                  color="rgba(0, 255, 255, 0.35)"
                />
                <ScanLines opacity={0.2 * glitchIntensity} />
                <NoiseOverlay opacity={0.15 * glitchIntensity} frame={frame} />
              </>
            )}

            {/* Dashboard content */}
            <DashboardContent
              showNew={showNewContent}
              transitionProgress={contentProgress}
              isGlitching={isGlitching}
              frame={frame}
            />

            {/* Deployed badge */}
            <Sequence from={glitchEnd + 30}>
              <DeployedBadge progress={deployedProgress} />
            </Sequence>
          </div>
        </div>
      </AbsoluteFill>

      {/* Dramatic scan line overlay during glitch */}
      {isGlitching && (
        <AbsoluteFill>
          <ScanLines opacity={0.1 * glitchIntensity} gap={2} />
        </AbsoluteFill>
      )}

      {/* Celebration particles after deployment */}
      {frame > glitchEnd + 30 && <CelebrationParticles startFrame={glitchEnd + 30} />}
    </AbsoluteFill>
  );
}

type DeployingIndicatorProps = {
  progress: number;
  frame: number;
};

function DeployingIndicator({ progress, frame }: DeployingIndicatorProps) {
  const opacity = interpolate(progress, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        justifyContent: "center",
        paddingTop: 40,
      }}
    >
      <div
        style={{
          opacity,
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "16px 32px",
          backgroundColor: `${COLORS.darkCard}ee`,
          borderRadius: 16,
          border: `1px solid ${COLORS.cyan}40`,
        }}
      >
        {/* Spinner */}
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            border: `3px solid ${COLORS.cyan}`,
            borderTopColor: "transparent",
            transform: `rotate(${frame * 12}deg)`,
          }}
        />
        <span
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: COLORS.cyan,
            fontFamily: "Inter, sans-serif",
          }}
        >
          Deploying changes...
        </span>
      </div>
    </AbsoluteFill>
  );
}

type BrowserChromeProps = {
  isGlitching: boolean;
  frame: number;
};

function BrowserChrome({ isGlitching, frame }: BrowserChromeProps) {
  return (
    <div
      style={{
        padding: "16px 24px",
        backgroundColor: COLORS.darkBorder,
        display: "flex",
        alignItems: "center",
        gap: 16,
        transform: isGlitching
          ? `translateX(${glitchOffset(frame, 4, 50)}px)`
          : "none",
      }}
    >
      <div style={{ display: "flex", gap: 10 }}>
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
          borderRadius: 10,
          padding: "12px 18px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span style={{ color: COLORS.success, fontSize: 14 }}>🔒</span>
        <span
          style={{
            fontSize: 15,
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
            width: 26,
            height: 26,
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

type DashboardContentProps = {
  showNew: boolean;
  transitionProgress: number;
  isGlitching: boolean;
  frame: number;
};

function DashboardContent({
  showNew,
  transitionProgress,
  isGlitching,
  frame,
}: DashboardContentProps) {
  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        padding: 36,
        transform: isGlitching
          ? `translateX(${glitchOffset(frame, 6, 25)}px)`
          : "none",
      }}
    >
      {/* Dashboard Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 28,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: `linear-gradient(135deg, ${COLORS.success}, #059669)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
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
                    text={showNew ? "Pulse Dashboard" : "Deploying..."}
                    fontSize={30}
                    glitchIntensity={8}
                    isGlitching={true}
                  />
                )
                : (
                  <TextMorph
                    fromText="Deploying..."
                    toText="Pulse Dashboard"
                    progress={transitionProgress}
                    fontSize={30}
                  />
                )}
            </div>
            <div
              style={{
                fontSize: 15,
                color: COLORS.textSecondary,
                fontFamily: "Inter, sans-serif",
                opacity: isGlitching ? 0.6 : 1,
              }}
            >
              {showNew ? "Fully optimized and live" : "Changes deploying..."}
            </div>
          </div>
        </div>

        {/* Autopilot toggle - only visible in new version */}
        {showNew && !isGlitching && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 22px",
              backgroundColor: `${COLORS.cyan}20`,
              borderRadius: 22,
              border: `1px solid ${COLORS.cyan}50`,
              opacity: interpolate(transitionProgress, [0.5, 1], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            <span style={{ fontSize: 16 }}>⚡</span>
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: COLORS.cyan,
                fontFamily: "Inter, sans-serif",
              }}
            >
              Autopilot LIVE
            </span>
          </div>
        )}
      </div>

      {/* Platform Status Grid */}
      <PlatformGrid isGlitching={isGlitching} />

      {/* Metrics Chart */}
      <div style={{ flex: 1, marginTop: 24 }}>
        <MetricsChart isGlitching={isGlitching} />
      </div>

      {/* Success message - only in new version */}
      {showNew && !isGlitching && (
        <div
          style={{
            marginTop: 20,
            padding: 18,
            backgroundColor: `${COLORS.success}12`,
            borderRadius: 14,
            border: `1px solid ${COLORS.success}40`,
            display: "flex",
            alignItems: "center",
            gap: 14,
            opacity: interpolate(transitionProgress, [0.7, 1], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <span style={{ fontSize: 22 }}>🚀</span>
          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: COLORS.success,
                fontFamily: "Inter, sans-serif",
              }}
            >
              Deployment Complete
            </div>
            <div
              style={{
                fontSize: 13,
                color: COLORS.textSecondary,
                fontFamily: "Inter, sans-serif",
              }}
            >
              All optimizations are now live across all platforms
            </div>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
}

type PlatformGridProps = {
  isGlitching: boolean;
};

function PlatformGrid({ isGlitching }: PlatformGridProps) {
  const fullPlatforms = [
    { name: "Instagram", value: "24.5K", change: "+12%", color: "#E4405F" },
    { name: "Facebook", value: "18.2K", change: "+8%", color: "#1877F2" },
    { name: "Twitter/X", value: "9.8K", change: "+5%", color: "#9CA3AF" },
    { name: "LinkedIn", value: "12.1K", change: "+15%", color: "#0A66C2" },
    { name: "TikTok", value: "45.3K", change: "+28%", color: "#00F2EA" },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: 14,
        opacity: isGlitching ? 0.6 : 1,
      }}
    >
      {fullPlatforms.map((platform) => (
        <div
          key={platform.name}
          style={{
            padding: 18,
            backgroundColor: `${COLORS.darkBg}80`,
            borderRadius: 12,
            border: `1px solid ${COLORS.darkBorder}`,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: platform.color,
              marginBottom: 10,
              fontFamily: "Inter, sans-serif",
            }}
          >
            {platform.name}
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: COLORS.textPrimary,
              fontFamily: "Inter, sans-serif",
            }}
          >
            {platform.value}
          </div>
          <div
            style={{
              fontSize: 13,
              color: COLORS.success,
              fontFamily: "Inter, sans-serif",
              marginTop: 4,
            }}
          >
            {platform.change}
          </div>
        </div>
      ))}
    </div>
  );
}

type MetricsChartProps = {
  isGlitching: boolean;
};

function MetricsChart({ isGlitching }: MetricsChartProps) {
  const data = [75, 82, 78, 88, 72, 78, 85]; // Recovered metrics
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: `${COLORS.darkBg}60`,
        borderRadius: 14,
        padding: 22,
        opacity: isGlitching ? 0.6 : 1,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 18,
        }}
      >
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: COLORS.textPrimary,
            fontFamily: "Inter, sans-serif",
          }}
        >
          Engagement Trends (7 days)
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: COLORS.success,
            fontSize: 13,
            fontFamily: "Inter, sans-serif",
          }}
        >
          <span>📈</span>
          <span style={{ fontWeight: 600 }}>All metrics healthy</span>
        </div>
      </div>

      {/* Chart bars */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 10,
          height: 150,
        }}
      >
        {data.map((value, index) => {
          const wasFixed = index === 4; // Friday was fixed
          return (
            <div
              key={days[index]}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: "80%",
                  height: `${value}%`,
                  backgroundColor: wasFixed ? COLORS.cyan : COLORS.success,
                  borderRadius: 5,
                  opacity: 0.85,
                  boxShadow: wasFixed ? `0 0 12px ${COLORS.cyan}60` : "none",
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  color: wasFixed ? COLORS.cyan : COLORS.textMuted,
                  fontFamily: "Inter, sans-serif",
                  fontWeight: wasFixed ? 600 : 400,
                }}
              >
                {days[index]}
              </span>
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
  const { fps } = useVideoConfig();
  const glowPulse = pulse(frame, fps, 2);

  const scale = interpolate(progress, [0, 1], [0.5, 1]);
  const opacity = interpolate(progress, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 28,
        right: 28,
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 24px",
          backgroundColor: `${COLORS.success}20`,
          borderRadius: 12,
          border: `2px solid ${COLORS.success}`,
          boxShadow: `0 0 ${25 + glowPulse * 20}px ${COLORS.success}60`,
        }}
      >
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            backgroundColor: COLORS.success,
            boxShadow: `0 0 10px ${COLORS.success}`,
          }}
        />
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: COLORS.success,
            fontFamily: "Inter, sans-serif",
            letterSpacing: "0.05em",
          }}
        >
          DEPLOYED
        </span>
      </div>
    </div>
  );
}

type CelebrationParticlesProps = {
  startFrame: number;
};

function CelebrationParticles({ startFrame }: CelebrationParticlesProps) {
  const frame = useCurrentFrame();
  const relativeFrame = frame - startFrame;

  // Generate particles
  const particles = Array.from({ length: 20 }, (_, i) => {
    const seed = i * 7919;
    const x = 50 + ((seed % 40) - 20);
    const y = 50 + ((seed % 30) - 15);
    const size = (seed % 6) + 4;
    const speed = ((seed % 3) + 1) * 0.02;
    const direction = (seed % 360) * (Math.PI / 180);
    const color = i % 2 === 0 ? COLORS.cyan : COLORS.success;

    const distance = relativeFrame * speed * 100;
    const posX = x + Math.cos(direction) * distance;
    const posY = y + Math.sin(direction) * distance;
    const opacity = Math.max(0, 1 - relativeFrame * 0.02);

    return (
      <div
        key={i}
        style={{
          position: "absolute",
          left: `${posX}%`,
          top: `${posY}%`,
          width: size,
          height: size,
          borderRadius: "50%",
          backgroundColor: color,
          opacity,
          boxShadow: `0 0 ${size}px ${color}`,
        }}
      />
    );
  });

  return <AbsoluteFill style={{ pointerEvents: "none" }}>{particles}</AbsoluteFill>;
}
