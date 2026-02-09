import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { GradientMesh } from "../components/branding/GradientMesh";
import { countUp, pulse } from "../lib/animations";
import { COLORS, SPRING_CONFIGS } from "../lib/constants";

/**
 * Scene 7: ResultsProof (1470-1650 frames / 49-55 seconds)
 *
 * Before/after metrics comparison.
 *
 * Timeline (180 frames / 6s):
 * - 0-60f: Split screen: "Before" vs "After"
 * - 60-90f: Before metrics fade in (42%, 3 platforms)
 * - 90-120f: After metrics count up (72%, 5 platforms)
 * - 120-150f: "+30% Recovery" highlight
 * - 150-180f: "Automatically optimized. Zero manual work."
 */
export function ResultsProof() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Split screen entry
  const splitProgress = spring({
    frame,
    fps,
    config: SPRING_CONFIGS.smooth,
  });

  // Before panel entry
  const beforeProgress = spring({
    frame: frame - 30,
    fps,
    config: SPRING_CONFIGS.smooth,
  });

  // After panel entry
  const afterProgress = spring({
    frame: frame - 60,
    fps,
    config: SPRING_CONFIGS.smooth,
  });

  // Highlight entry
  const highlightProgress = spring({
    frame: frame - 120,
    fps,
    config: SPRING_CONFIGS.bouncy,
  });

  // Tagline entry
  const taglineProgress = spring({
    frame: frame - 150,
    fps,
    config: SPRING_CONFIGS.smooth,
  });

  // Count-up animations for After metrics
  const engagementCount = countUp(frame, fps, 72, 1, 90);
  const platformCount = countUp(frame, fps, 5, 0.5, 95);
  const recoveryCount = countUp(frame, fps, 30, 0.8, 100);

  return (
    <AbsoluteFill>
      {/* Background */}
      <GradientMesh animationSpeed={0.01} />

      {/* Header */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
          opacity: interpolate(splitProgress, [0, 0.5], [0, 1], {
            extrapolateRight: "clamp",
          }),
        }}
      >
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            fontFamily: "Inter, sans-serif",
            color: COLORS.textPrimary,
          }}
        >
          Real Results,{" "}
          <span
            style={{
              background: `linear-gradient(135deg, ${COLORS.cyan}, ${COLORS.purple})`,
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            Real Impact
          </span>
        </div>
      </div>

      {/* Split comparison */}
      <AbsoluteFill
        style={{
          display: "flex",
          padding: "140px 80px 100px",
          gap: 40,
        }}
      >
        {/* Before panel */}
        <BeforePanel progress={beforeProgress} />

        {/* VS divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: interpolate(splitProgress, [0.2, 0.6], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <div
            style={{
              padding: "12px 20px",
              backgroundColor: `${COLORS.darkCard}ee`,
              borderRadius: 12,
              border: `1px solid ${COLORS.darkBorder}`,
            }}
          >
            <span
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: COLORS.textMuted,
                fontFamily: "Inter, sans-serif",
              }}
            >
              VS
            </span>
          </div>
        </div>

        {/* After panel */}
        <AfterPanel
          progress={afterProgress}
          engagementCount={engagementCount}
          platformCount={platformCount}
        />
      </AbsoluteFill>

      {/* Recovery highlight */}
      <RecoveryHighlight
        progress={highlightProgress}
        recoveryCount={recoveryCount}
      />

      {/* Tagline */}
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
            opacity: interpolate(taglineProgress, [0, 0.5], [0, 1], {
              extrapolateRight: "clamp",
            }),
            transform: `translateY(${interpolate(taglineProgress, [0, 1], [20, 0])}px)`,
          }}
        >
          <div
            style={{
              padding: "16px 40px",
              backgroundColor: `${COLORS.darkCard}ee`,
              borderRadius: 12,
              border: `1px solid ${COLORS.cyan}30`,
            }}
          >
            <span
              style={{
                fontSize: 20,
                fontWeight: 500,
                color: COLORS.textSecondary,
                fontFamily: "Inter, sans-serif",
              }}
            >
              Automatically optimized.{" "}
              <span style={{ color: COLORS.cyan, fontWeight: 600 }}>
                Zero manual work.
              </span>
            </span>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

type PanelProps = {
  progress: number;
};

/**
 * Before panel showing old metrics
 */
function BeforePanel({ progress }: PanelProps) {
  const opacity = interpolate(progress, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });
  const translateX = interpolate(progress, [0, 1], [-30, 0]);

  return (
    <div
      style={{
        flex: 1,
        opacity,
        transform: `translateX(${translateX}px)`,
        backgroundColor: `${COLORS.darkCard}dd`,
        borderRadius: 24,
        border: `2px solid ${COLORS.error}40`,
        padding: 32,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            fontSize: 28,
          }}
        >
          📉
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: COLORS.error,
            fontFamily: "Inter, sans-serif",
          }}
        >
          Before
        </div>
      </div>

      {/* Metrics */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
        <MetricRow
          label="Engagement Rate"
          value="42%"
          color={COLORS.error}
          icon="📊"
        />
        <MetricRow
          label="Active Platforms"
          value="3"
          color={COLORS.textMuted}
          icon="🌐"
        />
        <MetricRow
          label="Weekly Trend"
          value="-18%"
          color={COLORS.error}
          icon="📉"
        />
        <MetricRow
          label="AI Optimization"
          value="OFF"
          color={COLORS.textMuted}
          icon="🤖"
        />
      </div>

      {/* Status badge */}
      <div
        style={{
          marginTop: 24,
          padding: "12px 20px",
          backgroundColor: `${COLORS.error}15`,
          borderRadius: 12,
          border: `1px solid ${COLORS.error}30`,
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: COLORS.error,
            fontFamily: "Inter, sans-serif",
          }}
        >
          Manual management required
        </span>
      </div>
    </div>
  );
}

type AfterPanelProps = {
  progress: number;
  engagementCount: number;
  platformCount: number;
};

/**
 * After panel showing improved metrics
 */
function AfterPanel({
  progress,
  engagementCount,
  platformCount,
}: AfterPanelProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const glowPulse = pulse(frame, fps, 1.5);

  const opacity = interpolate(progress, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });
  const translateX = interpolate(progress, [0, 1], [30, 0]);

  return (
    <div
      style={{
        flex: 1,
        opacity,
        transform: `translateX(${translateX}px)`,
        backgroundColor: `${COLORS.darkCard}dd`,
        borderRadius: 24,
        border: `2px solid ${COLORS.success}60`,
        padding: 32,
        display: "flex",
        flexDirection: "column",
        boxShadow: `0 0 ${30 + glowPulse * 20}px ${COLORS.success}20`,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            fontSize: 28,
          }}
        >
          📈
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: COLORS.success,
            fontFamily: "Inter, sans-serif",
          }}
        >
          After
        </div>
      </div>

      {/* Metrics */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
        <MetricRow
          label="Engagement Rate"
          value={`${engagementCount}%`}
          color={COLORS.success}
          icon="📊"
        />
        <MetricRow
          label="Active Platforms"
          value={`${platformCount}`}
          color={COLORS.cyan}
          icon="🌐"
        />
        <MetricRow
          label="Weekly Trend"
          value="+24%"
          color={COLORS.success}
          icon="📈"
        />
        <MetricRow
          label="AI Optimization"
          value="ON"
          color={COLORS.cyan}
          icon="🤖"
        />
      </div>

      {/* Status badge */}
      <div
        style={{
          marginTop: 24,
          padding: "12px 20px",
          backgroundColor: `${COLORS.success}15`,
          borderRadius: 12,
          border: `1px solid ${COLORS.success}30`,
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: COLORS.success,
            fontFamily: "Inter, sans-serif",
          }}
        >
          Fully automated with AI
        </span>
      </div>
    </div>
  );
}

type MetricRowProps = {
  label: string;
  value: string;
  color: string;
  icon: string;
};

function MetricRow({ label, value, color, icon }: MetricRowProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 20px",
        backgroundColor: `${COLORS.darkBg}60`,
        borderRadius: 12,
        border: `1px solid ${COLORS.darkBorder}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span
          style={{
            fontSize: 16,
            color: COLORS.textSecondary,
            fontFamily: "Inter, sans-serif",
          }}
        >
          {label}
        </span>
      </div>
      <span
        style={{
          fontSize: 24,
          fontWeight: 700,
          color,
          fontFamily: "Inter, sans-serif",
        }}
      >
        {value}
      </span>
    </div>
  );
}

type RecoveryHighlightProps = {
  progress: number;
  recoveryCount: number;
};

function RecoveryHighlight({ progress, recoveryCount }: RecoveryHighlightProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const glowPulse = pulse(frame, fps, 2);

  const scale = interpolate(progress, [0, 1], [0.5, 1]);
  const opacity = interpolate(progress, [0, 0.3], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity,
        zIndex: 10,
      }}
    >
      <div
        style={{
          padding: "20px 40px",
          background: `linear-gradient(135deg, ${COLORS.success}20, ${COLORS.cyan}20)`,
          borderRadius: 16,
          border: `2px solid ${COLORS.success}`,
          boxShadow: `0 0 ${40 + glowPulse * 30}px ${COLORS.success}50`,
        }}
      >
        <div
          style={{
            fontSize: 32,
            fontWeight: 700,
            fontFamily: "Inter, sans-serif",
            color: COLORS.success,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span>🚀</span>
          +{recoveryCount}% Recovery
        </div>
      </div>
    </div>
  );
}
