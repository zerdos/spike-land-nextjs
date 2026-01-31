import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientMesh } from "../components/branding/GradientMesh";
import { StageProgress } from "../components/ui/ProgressBar";
import { bezierPath, pulse } from "../lib/animations";
import { COLORS, SPRING_CONFIGS } from "../lib/constants";

/**
 * Scene 5: Transformation (930-1230 frames / 31-41 seconds)
 *
 * AI analyzes and transforms the dashboard.
 *
 * Timeline (300 frames / 10s):
 * - 0-60f: ProgressBar fills (stages: Analyzing, Optimizing, Deploying)
 * - 60-90f: Preview panel focuses, progress continues
 * - 90-150f: AI orb enters preview, begins scan effect
 * - 150-210f: Scan line sweeps across dashboard
 * - 210-270f: Dashboard morphs: 3 cards -> 5 cards, basic -> enhanced
 * - 270-300f: "OPTIMIZED BY AI" badge appears with bounce
 */
export function Transformation() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Panel entry animation
  const panelProgress = spring({
    frame,
    fps,
    config: SPRING_CONFIGS.smooth,
  });

  // Scan effect timing
  const scanProgress = interpolate(frame, [90, 210], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Transformation timing
  const transformationProgress = interpolate(frame, [210, 270], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Badge animation
  const badgeProgress = spring({
    frame: frame - 270,
    fps,
    config: SPRING_CONFIGS.bouncy,
  });

  // Determine dashboard state
  const showEnhanced = transformationProgress > 0.5;

  // Current stage for progress indicator
  const currentStage = frame < 60 ? 0 : frame < 150 ? 1 : frame < 240 ? 2 : 3;

  return (
    <AbsoluteFill>
      {/* Background */}
      <GradientMesh animationSpeed={0.008} />

      {/* Progress indicator at top */}
      <AbsoluteFill
        style={{
          display: "flex",
          justifyContent: "center",
          paddingTop: 50,
        }}
      >
        <div
          style={{
            padding: "16px 32px",
            backgroundColor: `${COLORS.darkCard}ee`,
            borderRadius: 16,
            border: `1px solid ${COLORS.darkBorder}`,
          }}
        >
          <StageProgress
            stages={["Analyzing", "Optimizing", "Deploying", "Complete"]}
            currentStage={currentStage}
            delay={0}
          />
        </div>
      </AbsoluteFill>

      {/* Centered layout */}
      <AbsoluteFill
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "120px 60px 60px",
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
              ? `0 0 50px ${COLORS.cyan}30, 0 20px 60px rgba(0,0,0,0.5)`
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
              height: 520,
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
            <Sequence from={270}>
              <OptimizedBadge progress={badgeProgress} />
            </Sequence>
          </div>
        </div>

        {/* AI Agent Orb - positioned absolutely */}
        <AIAgentOrb
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
        padding: "16px 24px",
        backgroundColor: COLORS.darkBorder,
        display: "flex",
        alignItems: "center",
        gap: 16,
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
    </div>
  );
}

type AIAgentOrbProps = {
  scanProgress: number;
  transformationProgress: number;
};

/**
 * Floating AI orb that scans the dashboard
 */
function AIAgentOrb({
  scanProgress,
  transformationProgress,
}: AIAgentOrbProps) {
  const frame = useCurrentFrame();
  const glowPulse = pulse(frame, 30, 2);

  // Orb movement
  let orbX: number;
  let orbY: number;
  let orbScale: number;

  if (scanProgress > 0 && scanProgress < 1) {
    // Scan phase: moving across dashboard
    const scanPath = bezierPath(
      scanProgress,
      { x: 400, y: 0 },
      { x: 200, y: 50 },
      { x: 0, y: 50 },
      { x: -200, y: 0 },
    );
    orbX = scanPath.x;
    orbY = scanPath.y;
    orbScale = 1;
  } else if (transformationProgress > 0) {
    // Settle phase: shrink and move to badge position
    const settleProgress = Math.min(1, transformationProgress);
    orbX = interpolate(settleProgress, [0, 1], [-200, 500]);
    orbY = interpolate(settleProgress, [0, 1], [0, -200]);
    orbScale = interpolate(settleProgress, [0, 0.5], [1, 0], {
      extrapolateRight: "clamp",
    });
  } else {
    // Entry position
    orbX = 400;
    orbY = 0;
    orbScale = interpolate(frame, [60, 90], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  }

  if (orbScale <= 0) return null;

  const orbSize = 80;

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
          inset: -30,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.cyan}50 0%, transparent 70%)`,
          filter: "blur(20px)",
          opacity: 0.6 + glowPulse * 0.3,
        }}
      />

      {/* Main orb */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${COLORS.cyan} 0%, ${COLORS.purple} 100%)`,
          boxShadow: `
            0 0 ${30 + glowPulse * 20}px ${COLORS.cyan}80,
            inset 0 0 25px rgba(255,255,255,0.3)
          `,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* AI icon */}
        <span style={{ fontSize: 36 }}>🤖</span>
      </div>

      {/* Orbiting ring */}
      <div
        style={{
          position: "absolute",
          inset: -12,
          borderRadius: "50%",
          border: `2px solid ${COLORS.cyan}60`,
          transform: `rotate(${frame * 3}deg)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -5,
            left: "50%",
            width: 10,
            height: 10,
            borderRadius: "50%",
            backgroundColor: COLORS.cyan,
            transform: "translateX(-50%)",
            boxShadow: `0 0 10px ${COLORS.cyan}`,
          }}
        />
      </div>
    </div>
  );
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
          height: 4,
          background: `linear-gradient(90deg, transparent, ${COLORS.cyan}, transparent)`,
          boxShadow: `0 0 30px ${COLORS.cyan}, 0 0 60px ${COLORS.cyan}50`,
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
          background: `linear-gradient(180deg, ${COLORS.cyan}08 0%, ${COLORS.cyan}18 100%)`,
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
        padding: 32,
        opacity: Math.max(0.3, contentOpacity),
        display: "flex",
        flexDirection: "column",
        gap: 18,
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
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
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
                fontSize: 26,
                fontWeight: 700,
                color: COLORS.textPrimary,
                fontFamily: "Inter, sans-serif",
              }}
            >
              {showEnhanced ? "Pulse Dashboard" : "Pulse Dashboard"}
            </div>
            <div
              style={{
                fontSize: 14,
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
              gap: 10,
              padding: "12px 20px",
              backgroundColor: `${COLORS.cyan}20`,
              borderRadius: 18,
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
        )}
      </div>

      {/* Platform cards grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: showEnhanced
            ? "repeat(5, 1fr)"
            : "repeat(3, 1fr)",
          gap: 14,
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
                padding: 16,
                backgroundColor: `${COLORS.darkBg}80`,
                borderRadius: 12,
                border: `1px solid ${COLORS.darkBorder}`,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "color" in platform ? platform.color : COLORS.textMuted,
                  fontFamily: "Inter, sans-serif",
                  marginBottom: 6,
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
              {"change" in platform && (
                <div
                  style={{
                    fontSize: 12,
                    color: platform.change.startsWith("+")
                      ? COLORS.success
                      : "#EF4444",
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

      {/* Chart area */}
      <div
        style={{
          flex: 1,
          backgroundColor: `${COLORS.darkBg}60`,
          borderRadius: 14,
          padding: 20,
          display: "flex",
          flexDirection: "column",
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
              fontSize: 15,
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
                gap: 8,
                color: COLORS.success,
                fontSize: 13,
                fontFamily: "Inter, sans-serif",
              }}
            >
              <span>📈</span>
              <span style={{ fontWeight: 600 }}>+24% recovery</span>
            </div>
          )}
        </div>

        {/* Chart bars */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "flex-end",
            gap: 12,
          }}
        >
          {[75, 82, 78, 88, 72, 78, 85].map((value, index) => {
            const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
            const wasAnomaly = index === 4;
            return (
              <div
                key={index}
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
                    height: `${showEnhanced ? value : value * 0.5}%`,
                    backgroundColor: wasAnomaly && showEnhanced ? COLORS.cyan : COLORS.success,
                    borderRadius: 5,
                    opacity: 0.85,
                    boxShadow: wasAnomaly && showEnhanced
                      ? `0 0 15px ${COLORS.cyan}60`
                      : "none",
                  }}
                />
                {showEnhanced && (
                  <span
                    style={{
                      fontSize: 11,
                      color: wasAnomaly ? COLORS.cyan : COLORS.textMuted,
                      fontFamily: "Inter, sans-serif",
                      fontWeight: wasAnomaly ? 600 : 400,
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
            padding: 16,
            backgroundColor: `${COLORS.success}10`,
            borderRadius: 14,
            border: `1px solid ${COLORS.success}30`,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <span style={{ fontSize: 20 }}>✅</span>
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: COLORS.success,
                fontFamily: "Inter, sans-serif",
              }}
            >
              AI Optimization Applied
            </div>
            <div
              style={{
                fontSize: 13,
                color: COLORS.textSecondary,
                fontFamily: "Inter, sans-serif",
              }}
            >
              Friday posts now scheduled at 2PM for optimal engagement
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
  const glowPulse = pulse(frame, 30, 2);

  const scale = interpolate(progress, [0, 1], [0.3, 1]);
  const opacity = interpolate(progress, [0, 0.3], [0, 1], {
    extrapolateRight: "clamp",
  });

  if (opacity <= 0) return null;

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
          gap: 12,
          padding: "14px 22px",
          backgroundColor: `${COLORS.success}15`,
          borderRadius: 14,
          border: `2px solid ${COLORS.success}`,
          boxShadow: `0 0 ${20 + glowPulse * 15}px ${COLORS.success}50`,
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
            fontSize: 16,
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
  const frame = useCurrentFrame();

  let statusText: string;
  let statusIcon: string;

  if (transformationProgress >= 1) {
    statusText = "Dashboard optimized successfully";
    statusIcon = "✅";
  } else if (transformationProgress > 0) {
    statusText = "Applying AI improvements...";
    statusIcon = "⚡";
  } else if (scanProgress > 0) {
    statusText = "Analyzing dashboard structure...";
    statusIcon = "🔍";
  } else {
    statusText = "AI Agent initializing...";
    statusIcon = "🤖";
  }

  return (
    <div
      style={{
        position: "absolute",
        bottom: 40,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 28px",
        backgroundColor: `${COLORS.darkCard}ee`,
        borderRadius: 24,
        border: `1px solid ${COLORS.darkBorder}`,
      }}
    >
      <span style={{ fontSize: 18 }}>{statusIcon}</span>
      <span
        style={{
          fontSize: 15,
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
            width: 18,
            height: 18,
            borderRadius: "50%",
            border: `2px solid ${COLORS.cyan}`,
            borderTopColor: "transparent",
            transform: `rotate(${frame * 10}deg)`,
          }}
        />
      )}
    </div>
  );
}
