import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientMesh } from "../components/branding/GradientMesh";
import { pulse } from "../lib/animations";
import { COLORS, SPRING_CONFIGS } from "../lib/constants";

/**
 * Scene 6: GoingLive (1230-1470 frames / 41-49 seconds)
 *
 * Shows the optimized dashboard syncing to all platforms and going live.
 * Clear visual: "Your changes are now live everywhere."
 *
 * Timeline (240 frames / 8s):
 * - 0-30f: Optimized dashboard visible, "Ready to publish" state
 * - 30-60f: "Publishing to all platforms..." indicator appears
 * - 60-120f: Sync wave animation sweeps across platform cards
 * - 120-180f: Each platform card turns green with checkmark (staggered)
 * - 180-240f: "ALL PLATFORMS SYNCED" badge + celebration
 */
export function GoingLive() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Panel entry
  const panelProgress = spring({
    frame,
    fps,
    config: SPRING_CONFIGS.smooth,
  });

  // Publishing indicator
  const publishingProgress = spring({
    frame: frame - 30,
    fps,
    config: SPRING_CONFIGS.smooth,
  });

  // Sync wave timing
  const syncWaveProgress = interpolate(frame, [60, 120], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Success badge
  const successProgress = spring({
    frame: frame - 180,
    fps,
    config: SPRING_CONFIGS.bouncy,
  });

  return (
    <AbsoluteFill>
      {/* Background */}
      <GradientMesh animationSpeed={0.01} />

      {/* Publishing status at top */}
      <PublishingStatus
        progress={publishingProgress}
        syncComplete={frame > 180}
        frame={frame}
      />

      {/* Main content */}
      <AbsoluteFill
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "100px 60px 60px",
        }}
      >
        <div
          style={{
            width: 1100,
            opacity: interpolate(panelProgress, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(panelProgress, [0, 1], [20, 0])}px)`,
            backgroundColor: `${COLORS.darkCard}ee`,
            borderRadius: 24,
            border: `1px solid ${COLORS.darkBorder}`,
            padding: 40,
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          }}
        >
          {/* Dashboard header */}
          <DashboardHeader syncComplete={frame > 180} />

          {/* Platform sync grid */}
          <PlatformSyncGrid
            syncWaveProgress={syncWaveProgress}
            frame={frame}
          />

          {/* Engagement chart */}
          <EngagementChart frame={frame} />
        </div>
      </AbsoluteFill>

      {/* Success badge overlay */}
      <Sequence from={180}>
        <SuccessBadge progress={successProgress} />
      </Sequence>

      {/* Celebration particles */}
      {frame > 200 && <CelebrationParticles startFrame={200} />}
    </AbsoluteFill>
  );
}

type PublishingStatusProps = {
  progress: number;
  syncComplete: boolean;
  frame: number;
};

function PublishingStatus({ progress, syncComplete, frame }: PublishingStatusProps) {
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
          backgroundColor: syncComplete
            ? `${COLORS.success}20`
            : `${COLORS.cyan}15`,
          borderRadius: 16,
          border: `1px solid ${syncComplete ? COLORS.success : COLORS.cyan}40`,
        }}
      >
        {syncComplete
          ? (
            <>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  backgroundColor: COLORS.success,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                }}
              >
                ✓
              </div>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: COLORS.success,
                  fontFamily: "Inter, sans-serif",
                }}
              >
                All platforms synced successfully
              </span>
            </>
          )
          : (
            <>
              {/* Animated spinner */}
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
                Publishing to all platforms...
              </span>
            </>
          )}
      </div>
    </AbsoluteFill>
  );
}

type DashboardHeaderProps = {
  syncComplete: boolean;
};

function DashboardHeader({ syncComplete }: DashboardHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 32,
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
          }}
        >
          📊
        </div>
        <div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: COLORS.textPrimary,
              fontFamily: "Inter, sans-serif",
            }}
          >
            Pulse Dashboard
          </div>
          <div
            style={{
              fontSize: 15,
              color: syncComplete ? COLORS.success : COLORS.textSecondary,
              fontFamily: "Inter, sans-serif",
            }}
          >
            {syncComplete ? "Live on all platforms" : "Syncing changes..."}
          </div>
        </div>
      </div>

      {/* Autopilot badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 22px",
          backgroundColor: `${COLORS.cyan}20`,
          borderRadius: 20,
          border: `1px solid ${COLORS.cyan}50`,
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
          Autopilot ON
        </span>
      </div>
    </div>
  );
}

type PlatformSyncGridProps = {
  syncWaveProgress: number;
  frame: number;
};

function PlatformSyncGrid({ syncWaveProgress, frame }: PlatformSyncGridProps) {
  const platforms = [
    { name: "Instagram", value: "24.5K", change: "+12%", color: "#E4405F", syncDelay: 0 },
    { name: "Facebook", value: "18.2K", change: "+8%", color: "#1877F2", syncDelay: 10 },
    { name: "Twitter/X", value: "12.1K", change: "+5%", color: "#9CA3AF", syncDelay: 20 },
    { name: "LinkedIn", value: "15.3K", change: "+15%", color: "#0A66C2", syncDelay: 30 },
    { name: "TikTok", value: "45.3K", change: "+28%", color: "#00F2EA", syncDelay: 40 },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: 16,
        marginBottom: 28,
      }}
    >
      {platforms.map((platform, index) => {
        // Calculate sync state for this platform
        const platformSyncStart = 120 + platform.syncDelay;
        const isSyncing = frame >= 60 && frame < platformSyncStart;
        const isSynced = frame >= platformSyncStart;

        // Sync wave highlight
        const wavePosition = syncWaveProgress * 5; // 0-5 across platforms
        const isHighlighted = Math.abs(wavePosition - index) < 0.8 && syncWaveProgress < 1;

        return (
          <div
            key={platform.name}
            style={{
              padding: 20,
              backgroundColor: isSynced
                ? `${COLORS.success}15`
                : `${COLORS.darkBg}80`,
              borderRadius: 14,
              border: isSynced
                ? `2px solid ${COLORS.success}60`
                : isHighlighted
                ? `2px solid ${COLORS.cyan}`
                : `1px solid ${COLORS.darkBorder}`,
              boxShadow: isHighlighted
                ? `0 0 20px ${COLORS.cyan}40`
                : isSynced
                ? `0 0 15px ${COLORS.success}30`
                : "none",
              transition: "all 0.1s ease",
              position: "relative",
            }}
          >
            {/* Sync status indicator */}
            <div
              style={{
                position: "absolute",
                top: 12,
                right: 12,
              }}
            >
              {isSynced
                ? (
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      backgroundColor: COLORS.success,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      color: "white",
                      fontWeight: 700,
                    }}
                  >
                    ✓
                  </div>
                )
                : isSyncing
                ? (
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      border: `2px solid ${COLORS.cyan}`,
                      borderTopColor: "transparent",
                      transform: `rotate(${frame * 15}deg)`,
                    }}
                  />
                )
                : (
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      backgroundColor: COLORS.textMuted,
                    }}
                  />
                )}
            </div>

            <div
              style={{
                fontSize: 14,
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
                fontSize: 24,
                fontWeight: 700,
                color: COLORS.textPrimary,
                fontFamily: "Inter, sans-serif",
              }}
            >
              {platform.value}
            </div>
            <div
              style={{
                fontSize: 14,
                color: COLORS.success,
                fontFamily: "Inter, sans-serif",
                marginTop: 6,
              }}
            >
              {platform.change}
            </div>

            {/* Synced label */}
            {isSynced && (
              <div
                style={{
                  marginTop: 10,
                  fontSize: 11,
                  color: COLORS.success,
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Synced
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

type EngagementChartProps = {
  frame: number;
};

function EngagementChart({ frame }: EngagementChartProps) {
  const data = [75, 82, 78, 88, 72, 78, 85]; // Recovered metrics
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const isSynced = frame > 180;

  return (
    <div
      style={{
        backgroundColor: `${COLORS.darkBg}60`,
        borderRadius: 16,
        padding: 24,
        border: isSynced ? `1px solid ${COLORS.success}30` : `1px solid ${COLORS.darkBorder}`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: COLORS.textPrimary,
            fontFamily: "Inter, sans-serif",
          }}
        >
          Engagement Trends (Optimized)
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: COLORS.success,
            fontSize: 14,
            fontFamily: "Inter, sans-serif",
          }}
        >
          <span>📈</span>
          <span style={{ fontWeight: 600 }}>+30% recovery</span>
        </div>
      </div>

      {/* Chart bars */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 12,
          height: 140,
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
                  borderRadius: 6,
                  opacity: 0.85,
                  boxShadow: wasFixed ? `0 0 12px ${COLORS.cyan}50` : "none",
                }}
              />
              <span
                style={{
                  fontSize: 12,
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

type SuccessBadgeProps = {
  progress: number;
};

function SuccessBadge({ progress }: SuccessBadgeProps) {
  const frame = useCurrentFrame();
  const glowPulse = pulse(frame, 30, 2);

  const scale = interpolate(progress, [0, 1], [0.5, 1]);
  const opacity = interpolate(progress, [0, 0.3], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        paddingBottom: 50,
      }}
    >
      <div
        style={{
          opacity,
          transform: `scale(${scale})`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "18px 36px",
            background: `linear-gradient(135deg, ${COLORS.success}20, ${COLORS.cyan}15)`,
            borderRadius: 16,
            border: `2px solid ${COLORS.success}`,
            boxShadow: `0 0 ${30 + glowPulse * 20}px ${COLORS.success}50`,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              backgroundColor: COLORS.success,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              color: "white",
              fontWeight: 700,
            }}
          >
            ✓
          </div>
          <span
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: COLORS.success,
              fontFamily: "Inter, sans-serif",
              letterSpacing: "0.02em",
            }}
          >
            ALL PLATFORMS SYNCED
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
}

type CelebrationParticlesProps = {
  startFrame: number;
};

function CelebrationParticles({ startFrame }: CelebrationParticlesProps) {
  const frame = useCurrentFrame();
  const relativeFrame = frame - startFrame;

  const particles = Array.from({ length: 16 }, (_, i) => {
    const seed = i * 7919;
    const startX = 50;
    const startY = 85; // Start from bottom center (badge position)
    const angle = (i / 16) * Math.PI * 2; // Spread in circle
    const speed = ((seed % 3) + 2) * 0.015;
    const size = (seed % 5) + 4;
    const color = i % 2 === 0 ? COLORS.success : COLORS.cyan;

    const distance = relativeFrame * speed * 100;
    const posX = startX + Math.cos(angle) * distance * 0.8;
    const posY = startY - Math.sin(angle) * distance * 0.5 - relativeFrame * 0.5;
    const opacity = Math.max(0, 1 - relativeFrame * 0.025);

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
