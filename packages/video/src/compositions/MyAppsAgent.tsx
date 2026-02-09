import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientMesh } from "../components/branding/GradientMesh";
import { bezierPath, pulse } from "../lib/animations";
import { COLORS, SPRING_CONFIGS } from "../lib/constants";

/**
 * Scene 2: My-Apps Agent - AI Dashboard Transformation (90-240 frames / 3-8 seconds)
 *
 * Shows an AI agent orb visually "upgrading" a basic dashboard to an enhanced version.
 * Single centered panel with AI orb overlay - no split panels.
 *
 * Timeline (150 frames / 5 seconds):
 * - 0-20: Dashboard panel fades in (basic state)
 * - 20-40: AI orb enters from right with particle trail
 * - 40-70: Orb scans dashboard with cyan highlight effect
 * - 70-100: Transformation wipe reveals enhanced dashboard
 * - 100-130: "OPTIMIZED BY AI" badge appears with bouncy animation
 * - 130-150: Final settled state with subtle glow
 */
export function MyAppsAgent() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Panel entry animation
  const panelProgress = spring({
    frame,
    fps,
    config: SPRING_CONFIGS.smooth,
  });

  // AI orb animation phases
  const orbEntryProgress = interpolate(frame, [20, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const scanProgress = interpolate(frame, [40, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const transformationProgress = interpolate(frame, [70, 100], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Badge animation
  const badgeProgress = spring({
    frame: frame - 100,
    fps,
    config: SPRING_CONFIGS.bouncy,
  });

  // Determine dashboard state
  const showEnhanced = transformationProgress > 0.5;

  return (
    <AbsoluteFill>
      {/* Background */}
      <GradientMesh animationSpeed={0.008} />

      {/* Centered layout */}
      <AbsoluteFill
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: 60,
        }}
      >
        {/* Main dashboard panel */}
        <div
          style={{
            width: 1100,
            opacity: interpolate(panelProgress, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(panelProgress, [0, 1], [30, 0])}px)`,
            backgroundColor: `${COLORS.darkCard}ee`,
            borderRadius: 20,
            border: `1px solid ${COLORS.darkBorder}`,
            overflow: "hidden",
            boxShadow: showEnhanced
              ? `0 0 40px ${COLORS.cyan}30, 0 20px 60px rgba(0,0,0,0.5)`
              : "0 20px 60px rgba(0,0,0,0.5)",
            position: "relative",
          }}
        >
          {/* Browser chrome */}
          <BrowserChrome />

          {/* Dashboard content with scan effect */}
          <div
            style={{
              position: "relative",
              height: 480,
              background: `linear-gradient(180deg, ${COLORS.darkBg} 0%, #0f0f1a 100%)`,
              overflow: "hidden",
            }}
          >
            {/* Scan effect overlay */}
            {scanProgress > 0 && scanProgress < 1 && <ScanEffect progress={scanProgress} />}

            {/* Dashboard content */}
            <DashboardPanel
              showEnhanced={showEnhanced}
              transitionProgress={transformationProgress}
            />

            {/* Optimized badge */}
            <Sequence from={100}>
              <OptimizedBadge progress={badgeProgress} />
            </Sequence>
          </div>
        </div>

        {/* AI Agent Orb - positioned absolutely */}
        <AIAgentOrb
          entryProgress={orbEntryProgress}
          scanProgress={scanProgress}
          transformationProgress={transformationProgress}
        />
      </AbsoluteFill>

      {/* Status bar at bottom */}
      <AIStatusBar
        scanProgress={scanProgress}
        transformationProgress={transformationProgress}
      />
    </AbsoluteFill>
  );
}

/**
 * Browser chrome header with traffic lights and URL
 */
function BrowserChrome() {
  return (
    <div
      style={{
        padding: "14px 20px",
        backgroundColor: COLORS.darkBorder,
        display: "flex",
        alignItems: "center",
        gap: 16,
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
    </div>
  );
}

type AIAgentOrbProps = {
  entryProgress: number;
  scanProgress: number;
  transformationProgress: number;
};

/**
 * Floating AI orb that scans the dashboard
 */
function AIAgentOrb({
  entryProgress,
  scanProgress,
  transformationProgress,
}: AIAgentOrbProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const glowPulse = pulse(frame, fps, 2);

  // Orb path using bezier curve
  // Entry: comes from right side
  // Scan: moves across the panel
  // Settle: moves to corner

  let orbX: number;
  let orbY: number;
  let orbScale: number;

  if (entryProgress < 1) {
    // Entry phase: coming from right
    const entryPath = bezierPath(
      entryProgress,
      { x: 700, y: 200 }, // Start off-screen right
      { x: 500, y: 150 },
      { x: 400, y: 250 },
      { x: 350, y: 200 }, // End position for scan start
    );
    orbX = entryPath.x;
    orbY = entryPath.y;
    orbScale = interpolate(entryProgress, [0, 1], [0.5, 1]);
  } else if (scanProgress > 0 && scanProgress < 1) {
    // Scan phase: moving across dashboard
    const scanPath = bezierPath(
      scanProgress,
      { x: 350, y: 200 },
      { x: 100, y: 250 },
      { x: -100, y: 200 },
      { x: -300, y: 150 },
    );
    orbX = scanPath.x;
    orbY = scanPath.y;
    orbScale = 1;
  } else if (transformationProgress > 0) {
    // Settle phase: shrink and move to badge position
    const settleProgress = Math.min(1, transformationProgress);
    orbX = interpolate(settleProgress, [0, 1], [-300, 450]);
    orbY = interpolate(settleProgress, [0, 1], [150, -180]);
    orbScale = interpolate(settleProgress, [0, 0.5], [1, 0], {
      extrapolateRight: "clamp",
    });
  } else {
    orbX = 350;
    orbY = 200;
    orbScale = 1;
  }

  if (orbScale <= 0) return null;

  const orbSize = 60;

  return (
    <div
      style={{
        position: "absolute",
        right: `calc(50% - ${orbX}px)`,
        top: `calc(50% + ${orbY}px)`,
        width: orbSize,
        height: orbSize,
        transform: `translate(50%, -50%) scale(${orbScale})`,
        pointerEvents: "none",
      }}
    >
      {/* Outer glow */}
      <div
        style={{
          position: "absolute",
          inset: -20,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.cyan}40 0%, transparent 70%)`,
          filter: "blur(15px)",
          opacity: 0.5 + glowPulse * 0.3,
        }}
      />

      {/* Particle trail */}
      {entryProgress > 0 && scanProgress < 1 && <ParticleTrail frame={frame} />}

      {/* Main orb */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${COLORS.cyan} 0%, ${COLORS.purple} 100%)`,
          boxShadow: `
            0 0 ${20 + glowPulse * 15}px ${COLORS.cyan}80,
            inset 0 0 20px rgba(255,255,255,0.3)
          `,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* AI icon */}
        <span style={{ fontSize: 28 }}>🤖</span>
      </div>

      {/* Orbiting ring */}
      <div
        style={{
          position: "absolute",
          inset: -8,
          borderRadius: "50%",
          border: `2px solid ${COLORS.cyan}60`,
          transform: `rotate(${frame * 3}deg)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -4,
            left: "50%",
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: COLORS.cyan,
            transform: "translateX(-50%)",
          }}
        />
      </div>
    </div>
  );
}

type ParticleTrailProps = {
  frame: number;
};

/**
 * Particle trail following the AI orb
 */
function ParticleTrail({ frame }: ParticleTrailProps) {
  const particles = Array.from({ length: 8 }, (_, i) => {
    const delay = i * 3;
    const opacity = Math.max(0, 1 - (frame % 15 + delay) / 20);
    const offsetX = -i * 12;
    const offsetY = Math.sin((frame + i * 10) * 0.2) * 8;

    return (
      <div
        key={i}
        style={{
          position: "absolute",
          left: offsetX,
          top: "50%",
          width: 6 - i * 0.5,
          height: 6 - i * 0.5,
          borderRadius: "50%",
          backgroundColor: COLORS.cyan,
          opacity: opacity * 0.6,
          transform: `translateY(${offsetY}px)`,
        }}
      />
    );
  });

  return <>{particles}</>;
}

type ScanEffectProps = {
  progress: number;
};

/**
 * Cyan scan line effect during AI analysis
 */
function ScanEffect({ progress }: ScanEffectProps) {
  const scanLineY = interpolate(progress, [0, 1], [0, 100]);

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* Scan line */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: `${scanLineY}%`,
          height: 3,
          background: `linear-gradient(90deg, transparent, ${COLORS.cyan}, transparent)`,
          boxShadow: `0 0 20px ${COLORS.cyan}, 0 0 40px ${COLORS.cyan}50`,
          transform: "translateY(-50%)",
        }}
      />

      {/* Highlight overlay above scan line */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: `${scanLineY}%`,
          background: `linear-gradient(180deg, ${COLORS.cyan}08 0%, ${COLORS.cyan}15 100%)`,
        }}
      />
    </AbsoluteFill>
  );
}

type DashboardPanelProps = {
  showEnhanced: boolean;
  transitionProgress: number;
};

/**
 * Dashboard content that transforms from basic to enhanced
 */
function DashboardPanel({
  showEnhanced,
  transitionProgress,
}: DashboardPanelProps) {
  // Fade effect during transformation
  const contentOpacity = transitionProgress > 0 && transitionProgress < 1
    ? 1 - Math.abs(transitionProgress - 0.5) * 1.5
    : 1;

  return (
    <AbsoluteFill
      style={{
        padding: 28,
        opacity: Math.max(0.3, contentOpacity),
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* Dashboard header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
                fontSize: 24,
                fontWeight: 700,
                color: COLORS.textPrimary,
                fontFamily: "Inter, sans-serif",
              }}
            >
              Pulse Dashboard
            </div>
            <div
              style={{
                fontSize: 13,
                color: COLORS.textSecondary,
                fontFamily: "Inter, sans-serif",
              }}
            >
              {showEnhanced
                ? "Full-featured monitoring"
                : "Basic metrics view"}
            </div>
          </div>
        </div>

        {/* Autopilot toggle - only in enhanced */}
        {showEnhanced && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              backgroundColor: `${COLORS.cyan}20`,
              borderRadius: 16,
              border: `1px solid ${COLORS.cyan}40`,
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

      {/* Platform cards grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: showEnhanced
            ? "repeat(5, 1fr)"
            : "repeat(3, 1fr)",
          gap: 12,
        }}
      >
        {(showEnhanced
          ? [
            { name: "IG", value: "24K", change: "+12%", color: "#E4405F" },
            { name: "FB", value: "18K", change: "+8%", color: "#1877F2" },
            { name: "X", value: "12K", change: "-3%", color: "#9CA3AF" },
            { name: "LI", value: "15K", change: "+15%", color: "#0A66C2" },
            { name: "TT", value: "45K", change: "+28%", color: "#00F2EA" },
          ]
          : [
            { name: "IG", value: "24K" },
            { name: "FB", value: "18K" },
            { name: "X", value: "12K" },
          ]).map((platform) => (
            <div
              key={platform.name}
              style={{
                padding: 14,
                backgroundColor: `${COLORS.darkBg}80`,
                borderRadius: 10,
                border: `1px solid ${COLORS.darkBorder}`,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "color" in platform ? platform.color : COLORS.textMuted,
                  fontFamily: "Inter, sans-serif",
                  marginBottom: 4,
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
                    fontSize: 11,
                    color: platform.change.startsWith("+")
                      ? COLORS.success
                      : "#EF4444",
                    fontFamily: "Inter, sans-serif",
                    marginTop: 2,
                  }}
                >
                  {platform.change}
                </div>
              )}
            </div>
          ))}
      </div>

      {/* Chart area */}
      <div
        style={{
          flex: 1,
          backgroundColor: `${COLORS.darkBg}60`,
          borderRadius: 12,
          padding: 18,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
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
            {showEnhanced ? "Engagement Trends" : "Basic Metrics"}
          </div>
          {showEnhanced && (
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
            flex: 1,
            display: "flex",
            alignItems: "flex-end",
            gap: 10,
          }}
        >
          {[75, 82, 78, 88, 42, 65, 72].map((value, index) => {
            const isAnomaly = index === 4;
            const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
            return (
              <div
                key={index}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    width: "80%",
                    height: `${showEnhanced ? value : value * 0.5}%`,
                    backgroundColor: isAnomaly && showEnhanced ? "#EF4444" : COLORS.success,
                    borderRadius: 4,
                    opacity: 0.85,
                  }}
                />
                {showEnhanced && (
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

      {/* AI Recommendation - only in enhanced */}
      {showEnhanced && (
        <div
          style={{
            padding: 14,
            backgroundColor: `${COLORS.amber}10`,
            borderRadius: 12,
            border: `1px solid ${COLORS.amber}30`,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 18 }}>💡</span>
          <div>
            <div
              style={{
                fontSize: 13,
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
              Post at 2PM for +23% engagement recovery
            </div>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
}

type OptimizedBadgeProps = {
  progress: number;
};

/**
 * "OPTIMIZED BY AI" success badge
 */
function OptimizedBadge({ progress }: OptimizedBadgeProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const glowPulse = pulse(frame, fps, 2);

  const scale = interpolate(progress, [0, 1], [0.3, 1]);
  const opacity = interpolate(progress, [0, 0.3], [0, 1], {
    extrapolateRight: "clamp",
  });

  if (opacity <= 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 20,
        right: 20,
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 18px",
          backgroundColor: `${COLORS.success}15`,
          borderRadius: 12,
          border: `2px solid ${COLORS.success}`,
          boxShadow: `0 0 ${15 + glowPulse * 10}px ${COLORS.success}40`,
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
            fontWeight: 700,
            color: COLORS.success,
            fontFamily: "Inter, sans-serif",
            letterSpacing: "0.05em",
          }}
        >
          OPTIMIZED BY AI
        </span>
      </div>
    </div>
  );
}

type AIStatusBarProps = {
  scanProgress: number;
  transformationProgress: number;
};

/**
 * Status bar at bottom showing current AI action
 */
function AIStatusBar({
  scanProgress,
  transformationProgress,
}: AIStatusBarProps) {
  let statusText: string;
  let statusIcon: string;

  if (transformationProgress >= 1) {
    statusText = "Dashboard optimized";
    statusIcon = "✅";
  } else if (transformationProgress > 0) {
    statusText = "Applying improvements...";
    statusIcon = "⚡";
  } else if (scanProgress > 0) {
    statusText = "Analyzing dashboard...";
    statusIcon = "🔍";
  } else {
    statusText = "AI Agent ready";
    statusIcon = "🤖";
  }

  return (
    <div
      style={{
        position: "absolute",
        bottom: 30,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 20px",
        backgroundColor: `${COLORS.darkCard}dd`,
        borderRadius: 20,
        border: `1px solid ${COLORS.darkBorder}`,
      }}
    >
      <span style={{ fontSize: 16 }}>{statusIcon}</span>
      <span
        style={{
          fontSize: 14,
          color: transformationProgress >= 1 ? COLORS.success : COLORS.textSecondary,
          fontFamily: "Inter, sans-serif",
          fontWeight: transformationProgress >= 1 ? 600 : 400,
        }}
      >
        {statusText}
      </span>
      {scanProgress > 0 && transformationProgress < 1 && (
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            border: `2px solid ${COLORS.cyan}`,
            borderTopColor: "transparent",
            animation: "none",
            transform: `rotate(${scanProgress * 720}deg)`,
          }}
        />
      )}
    </div>
  );
}
