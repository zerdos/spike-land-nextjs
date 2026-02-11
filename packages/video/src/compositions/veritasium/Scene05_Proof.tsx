import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SuccessRateChart } from "../../components/diagrams";
import { COLORS, SPRING_CONFIGS, VERITASIUM_COLORS } from "../../lib/constants";

const EC = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

/**
 * Scene 05: Proof (750 frames / 25s)
 *
 * "Single-shot: ~60%. Agent loop: ~85%. With notes: climbing toward 90%+"
 *
 * Timeline:
 * - 0-350f: SuccessRateChart with progressive bar reveal
 * - 350-600f: Live demo mockup (browser frame with weather dashboard)
 * - 600-750f: Toast notification + confidence text
 */
export const Scene05_Proof: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- Phase 1: Chart (0-350f) ---
  const chartOpacity = interpolate(frame, [0, 30], [0, 1], EC);
  const chartExit = interpolate(frame, [310, 350], [1, 0], EC);
  const chartVisible = chartOpacity * chartExit;

  const revealCount = frame < 30 ? 0 : frame < 120 ? 1 : frame < 210 ? 2 : 3;

  // --- Phase 2: Browser mockup (350-600f) ---
  const browserEntry = spring({ frame: frame - 350, fps, config: SPRING_CONFIGS.smooth });
  const browserExit = interpolate(frame, [560, 600], [1, 0], EC);
  const browserVisible = browserEntry * browserExit;

  // --- Phase 3: Toast + confidence (600-750f) ---
  const toastEntry = spring({ frame: frame - 620, fps, config: SPRING_CONFIGS.snappy });
  const confidenceEntry = spring({ frame: frame - 670, fps, config: SPRING_CONFIGS.smooth });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.darkBg }}>
      {/* Subtle background gradient */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: `radial-gradient(ellipse at 50% 40%, ${VERITASIUM_COLORS.learning}08, transparent 70%)`,
      }} />

      {/* Phase 1: Success Rate Chart */}
      {frame < 360 && (
        <AbsoluteFill style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: chartVisible,
        }}>
          <SuccessRateChart delay={20} revealCount={revealCount} />
        </AbsoluteFill>
      )}

      {/* Phase 2: Browser mockup demo */}
      {frame >= 340 && frame < 610 && (
        <AbsoluteFill style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: browserVisible,
          transform: `scale(${interpolate(browserEntry, [0, 1], [0.95, 1])})`,
        }}>
          <BrowserMockup frame={frame - 350} fps={fps} />
        </AbsoluteFill>
      )}

      {/* Phase 3: Toast notification + confidence */}
      {frame >= 600 && (
        <>
          {/* Toast: bottom-right */}
          <div style={{
            position: "absolute",
            bottom: 80,
            right: 80,
            opacity: toastEntry,
            transform: `translateY(${interpolate(toastEntry, [0, 1], [20, 0])}px)`,
          }}>
            <ToastNotification />
          </div>

          {/* Confidence text: center */}
          <AbsoluteFill style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: confidenceEntry,
            transform: `translateY(${interpolate(confidenceEntry, [0, 1], [15, 0])}px)`,
          }}>
            <div style={{
              padding: "16px 36px",
              backgroundColor: `${COLORS.darkCard}ee`,
              borderRadius: 14,
              border: `1px solid ${VERITASIUM_COLORS.learning}40`,
              fontFamily: "Inter, sans-serif",
              fontSize: 22,
              fontWeight: 600,
              color: COLORS.textSecondary,
            }}>
              Notes applied:{" "}
              <span style={{ color: VERITASIUM_COLORS.learning, fontWeight: 700 }}>3</span>
            </div>
          </AbsoluteFill>
        </>
      )}
    </AbsoluteFill>
  );
};

/**
 * Browser frame mockup with a weather dashboard inside.
 */
const BrowserMockup: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const contentFade = spring({ frame: frame - 20, fps, config: SPRING_CONFIGS.smooth });

  return (
    <div style={{
      width: 1100,
      borderRadius: 16,
      overflow: "hidden",
      border: `1px solid ${COLORS.darkBorder}`,
      boxShadow: `0 20px 60px rgba(0,0,0,0.5)`,
    }}>
      {/* Title bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "12px 16px",
        backgroundColor: COLORS.darkCard,
        borderBottom: `1px solid ${COLORS.darkBorder}`,
      }}>
        {/* Traffic lights */}
        <div style={{ display: "flex", gap: 6 }}>
          {["#EF4444", "#EAB308", "#22C55E"].map((c) => (
            <div key={c} style={{
              width: 12, height: 12, borderRadius: "50%",
              backgroundColor: c,
            }} />
          ))}
        </div>

        {/* URL bar */}
        <div style={{
          flex: 1,
          marginLeft: 12,
          padding: "6px 14px",
          backgroundColor: `${COLORS.darkBg}cc`,
          borderRadius: 8,
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 13,
          color: COLORS.textMuted,
        }}>
          spike.land/create/weather-dashboard-with-charts
        </div>
      </div>

      {/* Browser content: weather dashboard */}
      <div style={{
        padding: 32,
        backgroundColor: COLORS.darkBg,
        opacity: contentFade,
        minHeight: 400,
      }}>
        <WeatherDashboard />
      </div>
    </div>
  );
};

/**
 * Mock weather dashboard content.
 */
const WeatherDashboard: React.FC = () => {
  const barData = [
    { label: "Mon", height: 60, color: VERITASIUM_COLORS.generating },
    { label: "Tue", height: 80, color: VERITASIUM_COLORS.generating },
    { label: "Wed", height: 55, color: VERITASIUM_COLORS.fixing },
    { label: "Thu", height: 72, color: VERITASIUM_COLORS.generating },
    { label: "Fri", height: 90, color: VERITASIUM_COLORS.learning },
    { label: "Sat", height: 68, color: VERITASIUM_COLORS.generating },
    { label: "Sun", height: 45, color: VERITASIUM_COLORS.planning },
  ];

  const stats = [
    { label: "Temperature", value: "72\u00B0F", color: VERITASIUM_COLORS.fixing },
    { label: "Humidity", value: "65%", color: VERITASIUM_COLORS.generating },
    { label: "Wind", value: "12 mph", color: VERITASIUM_COLORS.planning },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Title */}
      <div style={{
        fontSize: 28,
        fontWeight: 700,
        color: COLORS.textPrimary,
        fontFamily: "Inter, sans-serif",
      }}>
        Weather Dashboard
      </div>

      {/* Stat cards row */}
      <div style={{ display: "flex", gap: 16 }}>
        {stats.map((s) => (
          <div key={s.label} style={{
            flex: 1,
            padding: "20px 24px",
            backgroundColor: `${COLORS.darkCard}`,
            borderRadius: 12,
            border: `1px solid ${COLORS.darkBorder}`,
          }}>
            <div style={{
              fontSize: 13,
              color: COLORS.textMuted,
              fontFamily: "Inter, sans-serif",
              marginBottom: 6,
            }}>
              {s.label}
            </div>
            <div style={{
              fontSize: 32,
              fontWeight: 700,
              color: s.color,
              fontFamily: "JetBrains Mono, monospace",
            }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Temperature chart */}
      <div style={{
        padding: 20,
        backgroundColor: COLORS.darkCard,
        borderRadius: 12,
        border: `1px solid ${COLORS.darkBorder}`,
      }}>
        <div style={{
          fontSize: 14,
          color: COLORS.textMuted,
          fontFamily: "Inter, sans-serif",
          marginBottom: 16,
        }}>
          Weekly Temperature
        </div>
        <div style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 12,
          height: 120,
        }}>
          {barData.map((b) => (
            <div key={b.label} style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              flex: 1,
              gap: 6,
            }}>
              <div style={{
                width: "100%",
                height: b.height,
                borderRadius: "6px 6px 0 0",
                background: `linear-gradient(180deg, ${b.color}, ${b.color}60)`,
              }} />
              <div style={{
                fontSize: 11,
                color: COLORS.textMuted,
                fontFamily: "Inter, sans-serif",
              }}>
                {b.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Toast notification: "0 retries needed" with green checkmark.
 */
const ToastNotification: React.FC = () => (
  <div style={{
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 24px",
    backgroundColor: `${COLORS.darkCard}f0`,
    borderRadius: 12,
    border: `1px solid ${VERITASIUM_COLORS.learning}50`,
    boxShadow: `0 8px 24px rgba(0,0,0,0.4)`,
  }}>
    {/* Green checkmark */}
    <div style={{
      width: 28,
      height: 28,
      borderRadius: "50%",
      backgroundColor: `${VERITASIUM_COLORS.learning}20`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 16,
      color: VERITASIUM_COLORS.learning,
      fontWeight: 700,
    }}>
      &#x2713;
    </div>
    <div style={{
      fontFamily: "Inter, sans-serif",
      fontSize: 16,
      fontWeight: 600,
      color: COLORS.textPrimary,
    }}>
      0 retries needed
    </div>
  </div>
);
