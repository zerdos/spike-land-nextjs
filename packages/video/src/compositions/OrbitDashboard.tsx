import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientMesh } from "../components/branding/GradientMesh";
import { fadeIn, pulse } from "../lib/animations";
import { COLORS, SPRING_CONFIGS } from "../lib/constants";

/**
 * Scene 1: Orbit Pulse Dashboard (0-90 frames / 0-3 seconds)
 *
 * Shows Pulse health monitoring with anomaly detection.
 * Displays engagement drop alert and "Autopilot Recommendation Ready" notification.
 */
export function OrbitDashboard() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animation timing
  const headerDelay = 0;
  const chartDelay = 15;
  const anomalyDelay = 45;
  const notificationDelay = 65;

  // Entry animations
  const headerOpacity = fadeIn(frame, fps, 0.5, headerDelay);
  const panelProgress = spring({
    frame: frame - 10,
    fps,
    config: SPRING_CONFIGS.smooth,
  });

  // Notification animation
  const notificationProgress = spring({
    frame: frame - notificationDelay,
    fps,
    config: SPRING_CONFIGS.bouncy,
  });
  const notificationScale = interpolate(notificationProgress, [0, 1], [0.5, 1]);
  const notificationOpacity = interpolate(notificationProgress, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Glow pulse for notification
  const glowIntensity = pulse(frame, fps, 3);

  return (
    <AbsoluteFill>
      {/* Background */}
      <GradientMesh animationSpeed={0.01} />

      {/* Main content container */}
      <AbsoluteFill
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: 80,
        }}
      >
        {/* Dashboard panel */}
        <div
          style={{
            opacity: interpolate(panelProgress, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(panelProgress, [0, 1], [30, 0])}px)`,
            width: 950,
            backgroundColor: `${COLORS.darkCard}ee`,
            borderRadius: 24,
            border: `1px solid ${COLORS.darkBorder}`,
            padding: 48,
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          }}
        >
          {/* Header */}
          <div
            style={{
              opacity: headerOpacity,
              marginBottom: 32,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                {/* Orbit Pulse logo */}
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: `linear-gradient(135deg, ${COLORS.success}, #059669)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                  }}
                >
                  📊
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 700,
                      color: COLORS.textPrimary,
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    Pulse Health Monitor
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      color: COLORS.textSecondary,
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    Real-time analytics across all platforms
                  </div>
                </div>
              </div>

              {/* Status badge */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 16px",
                  backgroundColor: `${COLORS.success}20`,
                  borderRadius: 20,
                  border: `1px solid ${COLORS.success}40`,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: COLORS.success,
                  }}
                />
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: COLORS.success,
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  24/7 MONITORING
                </span>
              </div>
            </div>
          </div>

          {/* Platform Status Grid */}
          <PlatformStatusGrid delay={chartDelay} />

          {/* Engagement Trend Chart */}
          <div style={{ marginTop: 24 }}>
            <EngagementChart delay={chartDelay + 10} anomalyFrame={anomalyDelay} />
          </div>

          {/* Anomaly notification */}
          <Sequence from={notificationDelay}>
            <div
              style={{
                opacity: notificationOpacity,
                transform: `scale(${notificationScale})`,
                display: "flex",
                justifyContent: "center",
                marginTop: 24,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "16px 32px",
                  background: `linear-gradient(135deg, ${COLORS.amber}20, ${COLORS.gold}20)`,
                  borderRadius: 12,
                  border: `2px solid ${COLORS.amber}`,
                  boxShadow: `0 0 ${30 + glowIntensity * 20}px ${COLORS.amber}40`,
                }}
              >
                <div
                  style={{
                    fontSize: 24,
                  }}
                >
                  ⚠️
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: COLORS.amber,
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    AUTOPILOT RECOMMENDATION READY
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      color: COLORS.textSecondary,
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    Engagement dropped 42% — Dashboard optimization suggested
                  </div>
                </div>
              </div>
            </div>
          </Sequence>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

type PlatformStatusGridProps = {
  delay: number;
};

function PlatformStatusGrid({ delay }: PlatformStatusGridProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const platforms = [
    { name: "Instagram", color: "#E4405F", followers: "24.5K", change: "+12%", status: "healthy" },
    { name: "Facebook", color: "#1877F2", followers: "18.2K", change: "+8%", status: "healthy" },
    { name: "Twitter/X", color: "#9CA3AF", followers: "9.8K", change: "-3%", status: "warning" },
    { name: "LinkedIn", color: "#0A66C2", followers: "12.1K", change: "+15%", status: "healthy" },
    { name: "TikTok", color: "#00F2EA", followers: "45.3K", change: "+28%", status: "healthy" },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: 12,
      }}
    >
      {platforms.map((platform, index) => {
        const itemProgress = spring({
          frame: frame - delay - index * 4,
          fps,
          config: SPRING_CONFIGS.smooth,
        });
        const opacity = interpolate(itemProgress, [0, 1], [0, 1], {
          extrapolateRight: "clamp",
        });

        const isWarning = platform.status === "warning";

        return (
          <div
            key={platform.name}
            style={{
              opacity,
              padding: 16,
              backgroundColor: `${COLORS.darkBg}80`,
              borderRadius: 12,
              border: `1px solid ${isWarning ? COLORS.amber + "60" : COLORS.darkBorder}`,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: platform.color,
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
              {platform.followers}
            </div>
            <div
              style={{
                fontSize: 12,
                color: platform.change.startsWith("+") ? COLORS.success : "#EF4444",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {platform.change}
            </div>
          </div>
        );
      })}
    </div>
  );
}

type EngagementChartProps = {
  delay: number;
  anomalyFrame: number;
};

function EngagementChart({ delay, anomalyFrame }: EngagementChartProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Chart data with anomaly on day 5
  const data = [75, 82, 78, 88, 42, 65, 72]; // Friday has a dip
  const maxValue = 100;
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const chartProgress = spring({
    frame: frame - delay,
    fps,
    config: SPRING_CONFIGS.smooth,
  });

  return (
    <div
      style={{
        opacity: interpolate(chartProgress, [0, 1], [0, 1]),
        padding: 20,
        backgroundColor: `${COLORS.darkBg}60`,
        borderRadius: 12,
        border: `1px solid ${COLORS.darkBorder}`,
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
          Engagement Rate (7 days)
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "#EF4444",
            fontSize: 14,
            fontFamily: "Inter, sans-serif",
          }}
        >
          <span>📉</span>
          <span style={{ fontWeight: 600 }}>-18% this week</span>
        </div>
      </div>

      {/* Bar chart */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 8,
          height: 120,
        }}
      >
        {data.map((value, index) => {
          const barProgress = spring({
            frame: frame - delay - 5 - index * 3,
            fps,
            config: SPRING_CONFIGS.smooth,
          });

          const height = interpolate(barProgress, [0, 1], [0, (value / maxValue) * 100]);
          const isAnomaly = index === 4; // Friday
          const showAnomalyIndicator = frame > anomalyFrame && isAnomaly;

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
                  position: "relative",
                  width: "100%",
                  height: 100,
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                }}
              >
                {showAnomalyIndicator && (
                  <div
                    style={{
                      position: "absolute",
                      top: -8,
                      fontSize: 16,
                    }}
                  >
                    ⚠️
                  </div>
                )}
                <div
                  style={{
                    width: "80%",
                    height: `${height}%`,
                    backgroundColor: isAnomaly ? "#EF4444" : COLORS.success,
                    borderRadius: 4,
                    opacity: isAnomaly && showAnomalyIndicator ? 1 : 0.8,
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: isAnomaly ? COLORS.amber : COLORS.textMuted,
                  fontFamily: "Inter, sans-serif",
                  fontWeight: isAnomaly ? 600 : 400,
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
