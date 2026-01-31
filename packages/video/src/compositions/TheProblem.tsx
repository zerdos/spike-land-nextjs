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
 * Scene 2: TheProblem (150-390 frames / 5-13 seconds)
 *
 * Dashboard shows declining metrics, establishing the pain point.
 *
 * Timeline (240 frames / 8s):
 * - 0-30f: Dashboard panel slides in from bottom
 * - 30-90f: Platform status grid populates (staggered)
 * - 90-150f: Engagement chart draws with bars growing
 * - 150-180f: Friday bar drops dramatically (anomaly highlight)
 * - 180-210f: Warning badge bounces in
 * - 210-240f: Overlay text: "You can't be everywhere at once."
 */
export function TheProblem() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animation timing (slower than original 90 frames, now 240 frames)
  const headerDelay = 0;
  const chartDelay = 30;
  const anomalyDelay = 150;
  const notificationDelay = 180;
  const overlayTextDelay = 210;

  // Entry animations
  const headerOpacity = fadeIn(frame, fps, 0.8, headerDelay);
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

  // Overlay text animation
  const overlayProgress = spring({
    frame: frame - overlayTextDelay,
    fps,
    config: SPRING_CONFIGS.smooth,
  });
  const overlayOpacity = interpolate(overlayProgress, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });
  const overlayY = interpolate(overlayProgress, [0, 1], [30, 0]);

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
            transform: `translateY(${interpolate(panelProgress, [0, 1], [50, 0])}px)`,
            width: 1000,
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
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: `linear-gradient(135deg, ${COLORS.success}, #059669)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
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
                    Pulse Health Monitor
                  </div>
                  <div
                    style={{
                      fontSize: 15,
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
                  padding: "10px 18px",
                  backgroundColor: `${COLORS.success}20`,
                  borderRadius: 24,
                  border: `1px solid ${COLORS.success}40`,
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
          <div style={{ marginTop: 28 }}>
            <EngagementChart delay={chartDelay + 30} anomalyFrame={anomalyDelay} />
          </div>

          {/* Anomaly notification */}
          <Sequence from={notificationDelay}>
            <div
              style={{
                opacity: notificationOpacity,
                transform: `scale(${notificationScale})`,
                display: "flex",
                justifyContent: "center",
                marginTop: 28,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "18px 36px",
                  background: `linear-gradient(135deg, ${COLORS.amber}20, ${COLORS.gold}20)`,
                  borderRadius: 14,
                  border: `2px solid ${COLORS.amber}`,
                  boxShadow: `0 0 ${30 + glowIntensity * 25}px ${COLORS.amber}40`,
                }}
              >
                <div
                  style={{
                    fontSize: 28,
                  }}
                >
                  ⚠️
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: COLORS.amber,
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    ENGAGEMENT ALERT
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      color: COLORS.textSecondary,
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    Dropped 42% on Friday — Immediate action recommended
                  </div>
                </div>
              </div>
            </div>
          </Sequence>
        </div>
      </AbsoluteFill>

      {/* Overlay text at bottom */}
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          paddingBottom: 60,
        }}
      >
        <div
          style={{
            opacity: overlayOpacity,
            transform: `translateY(${overlayY}px)`,
          }}
        >
          <div
            style={{
              padding: "18px 44px",
              backgroundColor: `${COLORS.darkCard}ee`,
              borderRadius: 14,
              border: `1px solid ${COLORS.error}40`,
            }}
          >
            <span
              style={{
                fontSize: 26,
                fontWeight: 600,
                color: COLORS.textPrimary,
                fontFamily: "Inter, sans-serif",
              }}
            >
              You can't be <span style={{ color: COLORS.error }}>everywhere</span> at once.
            </span>
          </div>
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
        gap: 14,
      }}
    >
      {platforms.map((platform, index) => {
        // Slower stagger: 8 frames between each (was 4)
        const itemProgress = spring({
          frame: frame - delay - index * 8,
          fps,
          config: SPRING_CONFIGS.smooth,
        });
        const opacity = interpolate(itemProgress, [0, 1], [0, 1], {
          extrapolateRight: "clamp",
        });
        const translateY = interpolate(itemProgress, [0, 1], [20, 0]);

        const isWarning = platform.status === "warning";

        return (
          <div
            key={platform.name}
            style={{
              opacity,
              transform: `translateY(${translateY}px)`,
              padding: 18,
              backgroundColor: `${COLORS.darkBg}80`,
              borderRadius: 14,
              border: `1px solid ${isWarning ? COLORS.amber + "60" : COLORS.darkBorder}`,
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
              {platform.followers}
            </div>
            <div
              style={{
                fontSize: 13,
                color: platform.change.startsWith("+") ? COLORS.success : "#EF4444",
                fontFamily: "Inter, sans-serif",
                marginTop: 4,
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
        padding: 24,
        backgroundColor: `${COLORS.darkBg}60`,
        borderRadius: 14,
        border: `1px solid ${COLORS.darkBorder}`,
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
          Engagement Rate (7 days)
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            color: "#EF4444",
            fontSize: 15,
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
          gap: 10,
          height: 140,
        }}
      >
        {data.map((value, index) => {
          // Slower bar animation: 6 frames stagger (was 3)
          const barProgress = spring({
            frame: frame - delay - 10 - index * 6,
            fps,
            config: SPRING_CONFIGS.smooth,
          });

          const height = interpolate(barProgress, [0, 1], [0, (value / maxValue) * 100]);
          const isAnomaly = index === 4; // Friday
          const showAnomalyIndicator = frame > anomalyFrame && isAnomaly;

          // Anomaly shake effect
          const shakeX = showAnomalyIndicator
            ? Math.sin(frame * 0.5) * 2
            : 0;

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
                  position: "relative",
                  width: "100%",
                  height: 120,
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                }}
              >
                {showAnomalyIndicator && (
                  <div
                    style={{
                      position: "absolute",
                      top: -12,
                      fontSize: 20,
                      animation: "none",
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
                    borderRadius: 6,
                    opacity: isAnomaly && showAnomalyIndicator ? 1 : 0.8,
                    transform: `translateX(${shakeX}px)`,
                    boxShadow: isAnomaly && showAnomalyIndicator
                      ? `0 0 15px ${COLORS.error}60`
                      : "none",
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 12,
                  color: isAnomaly ? COLORS.amber : COLORS.textMuted,
                  fontFamily: "Inter, sans-serif",
                  fontWeight: isAnomaly ? 700 : 400,
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
