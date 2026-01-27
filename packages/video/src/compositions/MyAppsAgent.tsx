import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientMesh } from "../components/branding/GradientMesh";
import { ChatBubble, TypingIndicator } from "../components/ui/ChatBubble";
import { CodeBlock } from "../components/ui/CodeBlock";
import { StageProgress } from "../components/ui/ProgressBar";
import { COLORS, SPRING_CONFIGS } from "../lib/constants";

/**
 * Scene 2: My-Apps Agent Chat (90-240 frames / 3-8 seconds)
 *
 * Shows agent analyzing Pulse data and generating Orbit UI improvements.
 * Split-view with chat panel (left) and dashboard preview (right).
 */
export function MyAppsAgent() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Calculate which stage the agent is in based on frame
  const currentStage = frame < 30 ? 0 : frame < 60 ? 1 : frame < 100 ? 2 : 3;

  // Panel entry animations
  const leftPanelProgress = spring({
    frame,
    fps,
    config: SPRING_CONFIGS.smooth,
  });

  const rightPanelProgress = spring({
    frame: frame - 10,
    fps,
    config: SPRING_CONFIGS.smooth,
  });

  return (
    <AbsoluteFill>
      {/* Background */}
      <GradientMesh animationSpeed={0.008} />

      {/* Split layout */}
      <AbsoluteFill
        style={{
          display: "flex",
          padding: 60,
          gap: 40,
        }}
      >
        {/* Left panel - Chat */}
        <div
          style={{
            flex: 1,
            opacity: interpolate(leftPanelProgress, [0, 1], [0, 1]),
            transform: `translateX(${interpolate(leftPanelProgress, [0, 1], [-30, 0])}px)`,
            display: "flex",
            flexDirection: "column",
            backgroundColor: `${COLORS.darkCard}ee`,
            borderRadius: 20,
            border: `1px solid ${COLORS.darkBorder}`,
            overflow: "hidden",
          }}
        >
          {/* Chat header */}
          <div
            style={{
              padding: "20px 24px",
              borderBottom: `1px solid ${COLORS.darkBorder}`,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: `linear-gradient(135deg, ${COLORS.cyan}, ${COLORS.purple})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: 20 }}>🤖</span>
            </div>
            <div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: COLORS.textPrimary,
                  fontFamily: "Inter, sans-serif",
                }}
              >
                Orbit AI Agent
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: COLORS.success,
                  fontFamily: "Inter, sans-serif",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    backgroundColor: COLORS.success,
                  }}
                />
                Active
              </div>
            </div>
          </div>

          {/* Chat messages */}
          <div
            style={{
              flex: 1,
              padding: 24,
              overflowY: "auto",
            }}
          >
            {/* System message */}
            <Sequence from={5}>
              <ChatBubble
                message="Pulse detected engagement anomaly. Dashboard needs optimization for better monitoring."
                isAgent={false}
                delay={0}
                typingSpeed={45}
              />
            </Sequence>

            {/* Typing indicator */}
            <Sequence from={25} durationInFrames={20}>
              <TypingIndicator delay={0} />
            </Sequence>

            {/* Agent response */}
            <Sequence from={45}>
              <ChatBubble
                message="Analyzing metrics and generating UI improvements..."
                isAgent={true}
                delay={0}
                typingSpeed={40}
              />
            </Sequence>

            {/* Code snippet */}
            <Sequence from={70}>
              <div style={{ marginTop: 16 }}>
                <CodeBlock
                  code={`// Enhanced Orbit Dashboard
<PlatformStatusGrid />
<MetricsTrendChart />
<AutopilotToggle enabled />
<RecommendationCards />`}
                  language="tsx"
                  delay={0}
                  typingSpeed={45}
                />
              </div>
            </Sequence>

            {/* Status update */}
            <Sequence from={110}>
              <ChatBubble
                message="Enhanced dashboard deployed with autopilot controls!"
                isAgent={true}
                delay={0}
                typingSpeed={40}
              />
            </Sequence>
          </div>

          {/* Progress stages */}
          <div
            style={{
              padding: "16px 24px",
              borderTop: `1px solid ${COLORS.darkBorder}`,
              backgroundColor: `${COLORS.darkBg}80`,
            }}
          >
            <StageProgress
              stages={["Analyze", "Generate", "Apply", "Deploy"]}
              currentStage={currentStage}
              delay={10}
            />
          </div>
        </div>

        {/* Right panel - Preview */}
        <div
          style={{
            flex: 1.2,
            opacity: interpolate(rightPanelProgress, [0, 1], [0, 1]),
            transform: `translateX(${interpolate(rightPanelProgress, [0, 1], [30, 0])}px)`,
            backgroundColor: `${COLORS.darkCard}ee`,
            borderRadius: 20,
            border: `1px solid ${COLORS.darkBorder}`,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
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
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: "#ff5f56",
                }}
              />
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: "#ffbd2e",
                }}
              />
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: "#27ca3f",
                }}
              />
            </div>
            <div
              style={{
                flex: 1,
                backgroundColor: COLORS.darkBg,
                borderRadius: 6,
                padding: "6px 12px",
                fontSize: 13,
                color: COLORS.textMuted,
                fontFamily: "Inter, sans-serif",
              }}
            >
              spike.land/orbit
            </div>
          </div>

          {/* Preview content - Orbit Dashboard */}
          <div
            style={{
              flex: 1,
              background: `linear-gradient(180deg, ${COLORS.darkBg} 0%, #0f0f1a 100%)`,
              padding: 24,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <OrbitDashboardPreview frame={frame} />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

type OrbitDashboardPreviewProps = {
  frame: number;
};

function OrbitDashboardPreview({ frame }: OrbitDashboardPreviewProps) {
  // Show simplified dashboard initially, then enhanced version
  const transitionStart = 100;
  const transitionDuration = 30;
  const transitionProgress = interpolate(
    frame,
    [transitionStart, transitionStart + transitionDuration],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const showEnhanced = transitionProgress > 0.5;

  // Fade effect during transition
  const contentOpacity = transitionProgress > 0 && transitionProgress < 1
    ? 1 - Math.abs(transitionProgress - 0.5) * 2
    : 1;

  return (
    <div
      style={{
        opacity: contentOpacity,
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Dashboard header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: `linear-gradient(135deg, ${COLORS.success}, #059669)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
            }}
          >
            📊
          </div>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: COLORS.textPrimary,
              fontFamily: "Inter, sans-serif",
            }}
          >
            {showEnhanced ? "Pulse Dashboard (Enhanced)" : "Pulse Dashboard"}
          </span>
        </div>

        {/* Autopilot toggle - only shows in enhanced */}
        {showEnhanced && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              backgroundColor: `${COLORS.cyan}20`,
              borderRadius: 12,
              border: `1px solid ${COLORS.cyan}40`,
            }}
          >
            <span style={{ fontSize: 10, color: COLORS.cyan }}>⚡</span>
            <span
              style={{
                fontSize: 10,
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

      {/* Platform cards row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: showEnhanced ? "repeat(5, 1fr)" : "repeat(3, 1fr)",
          gap: 8,
        }}
      >
        {(showEnhanced ? ["IG", "FB", "X", "LI", "TT"] : ["IG", "FB", "X"]).map((platform) => {
          // Deterministic values for each platform (avoids flickering in Remotion)
          const followerCounts: Record<string, number> = {
            IG: 24,
            FB: 18,
            X: 12,
            LI: 15,
            TT: 45,
          };
          return (
            <div
              key={platform}
              style={{
                padding: 8,
                backgroundColor: `${COLORS.darkBg}80`,
                borderRadius: 6,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: COLORS.textMuted,
                  fontFamily: "Inter, sans-serif",
                }}
              >
                {platform}
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: COLORS.textPrimary,
                  fontFamily: "Inter, sans-serif",
                }}
              >
                {followerCounts[platform]}K
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart area */}
      <div
        style={{
          flex: 1,
          backgroundColor: `${COLORS.darkBg}60`,
          borderRadius: 8,
          padding: 12,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: COLORS.textMuted,
            marginBottom: 8,
            fontFamily: "Inter, sans-serif",
          }}
        >
          {showEnhanced ? "Engagement Trends" : "Basic Metrics"}
        </div>
        {/* Mini chart bars */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "flex-end",
            gap: 4,
          }}
        >
          {[40, 55, 45, 70, 30, 60, 75].map((h, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${showEnhanced ? h : h * 0.6}%`,
                backgroundColor: i === 4 ? "#EF4444" : COLORS.success,
                borderRadius: 2,
                opacity: 0.8,
              }}
            />
          ))}
        </div>
      </div>

      {/* Recommendations section - only in enhanced */}
      {showEnhanced && (
        <div
          style={{
            padding: 10,
            backgroundColor: `${COLORS.amber}10`,
            borderRadius: 8,
            border: `1px solid ${COLORS.amber}30`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 12 }}>💡</span>
            <span
              style={{
                fontSize: 10,
                color: COLORS.amber,
                fontFamily: "Inter, sans-serif",
              }}
            >
              AI Recommendation: Post at 2PM for +23% engagement
            </span>
          </div>
        </div>
      )}

      {/* Update indicator */}
      {transitionProgress > 0.8 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            opacity: interpolate(
              transitionProgress,
              [0.8, 1],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            ),
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: COLORS.success,
            }}
          />
          <span
            style={{
              fontSize: 10,
              color: COLORS.success,
              fontFamily: "Inter, sans-serif",
            }}
          >
            Enhanced dashboard deployed
          </span>
        </div>
      )}
    </div>
  );
}
