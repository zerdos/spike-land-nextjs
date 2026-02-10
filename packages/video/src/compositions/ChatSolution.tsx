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
import { ProgressBar, StageProgress } from "../components/ui/ProgressBar";
import { COLORS, SPRING_CONFIGS } from "../lib/constants";

/**
 * Scene 4: ChatSolution (570-930 frames / 19-31 seconds)
 *
 * User chats with AI, asks for help.
 *
 * Timeline (360 frames / 12s):
 * - 0-30f: Split view appears (chat left, preview right)
 * - 30-90f: User types: "Fix my engagement drop"
 * - 90-120f: TypingIndicator
 * - 120-210f: AI response types (recommendation)
 * - 210-270f: User: "Yes, do it"
 * - 270-360f: AI: "Optimizing now..." + ProgressBar starts
 */
export function ChatSolution() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Split view entry
  const splitProgress = spring({
    frame,
    fps,
    config: SPRING_CONFIGS.smooth,
  });

  const splitOpacity = interpolate(splitProgress, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Progress bar (starts at frame 300)
  const progressValue = interpolate(frame, [300, 360], [0, 45], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Current stage based on progress
  const currentStage = frame < 320 ? 0 : frame < 340 ? 1 : 2;

  return (
    <AbsoluteFill>
      {/* Background */}
      <GradientMesh animationSpeed={0.008} />

      {/* Main content */}
      <AbsoluteFill
        style={{
          display: "flex",
          padding: 60,
          gap: 40,
          opacity: splitOpacity,
        }}
      >
        {/* Left: Chat panel */}
        <div
          style={{
            flex: 1,
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
              padding: "16px 24px",
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
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${COLORS.cyan}, ${COLORS.purple})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
              }}
            >
              🤖
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
                AI Assistant
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: COLORS.cyan,
                  fontFamily: "Inter, sans-serif",
                }}
              >
                Online - Ready to help
              </div>
            </div>
          </div>

          {/* Chat messages */}
          <div
            style={{
              flex: 1,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
            }}
          >
            {/* User message 1 */}
            <Sequence from={30}>
              <ChatBubble
                message="Fix my engagement drop"
                isAi={false}
                delay={0}
                typingSpeed={35}
              />
            </Sequence>

            {/* AI typing indicator */}
            <Sequence from={90} durationInFrames={30}>
              <TypingIndicator delay={0} />
            </Sequence>

            {/* AI response */}
            <Sequence from={120}>
              <ChatBubble
                message="I've analyzed your data. Your Friday posts underperform due to timing. I recommend posting at 2PM when your audience is most active. Want me to optimize your dashboard?"
                isAi={true}
                delay={0}
                typingSpeed={45}
              />
            </Sequence>

            {/* User message 2 */}
            <Sequence from={210}>
              <ChatBubble
                message="Yes, do it"
                isAi={false}
                delay={0}
                typingSpeed={40}
              />
            </Sequence>

            {/* AI response with progress */}
            <Sequence from={270}>
              <ChatBubble
                message="On it. Optimizing your dashboard now..."
                isAi={true}
                delay={0}
                typingSpeed={35}
              />
            </Sequence>
          </div>

          {/* Progress section */}
          <Sequence from={300}>
            <div
              style={{
                padding: 24,
                borderTop: `1px solid ${COLORS.darkBorder}`,
              }}
            >
              <StageProgress
                stages={["Analyzing", "Optimizing", "Deploying"]}
                currentStage={currentStage}
                delay={0}
              />
              <div style={{ marginTop: 16 }}>
                <ProgressBar
                  progress={progressValue}
                  label="Optimization in progress"
                  delay={10}
                  color={COLORS.cyan}
                />
              </div>
            </div>
          </Sequence>
        </div>

        {/* Right: Preview panel */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            backgroundColor: `${COLORS.darkCard}ee`,
            borderRadius: 20,
            border: `1px solid ${COLORS.darkBorder}`,
            overflow: "hidden",
          }}
        >
          {/* Preview header */}
          <div
            style={{
              padding: "16px 24px",
              borderBottom: `1px solid ${COLORS.darkBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: COLORS.textSecondary,
                fontFamily: "Inter, sans-serif",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Live Preview
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: COLORS.success,
                  boxShadow: `0 0 8px ${COLORS.success}`,
                }}
              />
              <span
                style={{
                  fontSize: 12,
                  color: COLORS.success,
                  fontFamily: "Inter, sans-serif",
                }}
              >
                Connected
              </span>
            </div>
          </div>

          {/* Preview content */}
          <div
            style={{
              flex: 1,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <DashboardPreview frame={frame} />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

type DashboardPreviewProps = {
  frame: number;
};

/**
 * Dashboard preview showing current state
 */
function DashboardPreview({ frame }: DashboardPreviewProps) {
  // Highlight effect when AI is working (after frame 270)
  const isOptimizing = frame >= 270;
  const pulseOpacity = isOptimizing
    ? 0.3 + Math.sin(frame * 0.1) * 0.2
    : 0;

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: `${COLORS.darkBg}80`,
        borderRadius: 16,
        padding: 20,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Optimization highlight overlay */}
      {isOptimizing && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(135deg, ${COLORS.cyan}${
              Math.round(pulseOpacity * 255).toString(16).padStart(2, "0")
            }, transparent)`,
            borderRadius: 16,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Dashboard header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: `linear-gradient(135deg, ${COLORS.success}80, #059669)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
          }}
        >
          📊
        </div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: COLORS.textPrimary,
            fontFamily: "Inter, sans-serif",
          }}
        >
          Pulse Dashboard
        </div>
      </div>

      {/* Platform cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
          marginBottom: 16,
        }}
      >
        {[
          { name: "IG", value: "24K", color: "#E4405F" },
          { name: "FB", value: "18K", color: "#1877F2" },
          { name: "X", value: "9.8K", color: "#9CA3AF" },
        ].map((p) => (
          <div
            key={p.name}
            style={{
              padding: 12,
              backgroundColor: `${COLORS.darkCard}80`,
              borderRadius: 8,
              border: `1px solid ${COLORS.darkBorder}`,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: p.color,
                fontFamily: "Inter, sans-serif",
                marginBottom: 4,
              }}
            >
              {p.name}
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: COLORS.textPrimary,
                fontFamily: "Inter, sans-serif",
              }}
            >
              {p.value}
            </div>
          </div>
        ))}
      </div>

      {/* Engagement chart */}
      <div
        style={{
          flex: 1,
          backgroundColor: `${COLORS.darkCard}60`,
          borderRadius: 10,
          padding: 14,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: COLORS.textSecondary,
            fontFamily: "Inter, sans-serif",
            marginBottom: 12,
          }}
        >
          Engagement Rate (7 days)
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 6,
            height: 80,
          }}
        >
          {[75, 82, 78, 88, 42, 65, 72].map((value, i) => {
            const isAnomaly = i === 4;
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${value}%`,
                  backgroundColor: isAnomaly ? "#EF4444" : COLORS.success,
                  borderRadius: 3,
                  opacity: 0.8,
                  position: "relative",
                }}
              >
                {isAnomaly && (
                  <div
                    style={{
                      position: "absolute",
                      top: -20,
                      left: "50%",
                      transform: "translateX(-50%)",
                      fontSize: 12,
                    }}
                  >
                    ⚠️
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Warning badge */}
      <div
        style={{
          marginTop: 12,
          padding: "10px 14px",
          backgroundColor: `${COLORS.amber}15`,
          borderRadius: 8,
          border: `1px solid ${COLORS.amber}30`,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 14 }}>⚠️</span>
        <div
          style={{
            fontSize: 12,
            color: COLORS.amber,
            fontFamily: "Inter, sans-serif",
            fontWeight: 500,
          }}
        >
          Friday engagement -42%
        </div>
      </div>
    </div>
  );
}
