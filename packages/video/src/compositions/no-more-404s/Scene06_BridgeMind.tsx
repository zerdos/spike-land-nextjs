import React from "react";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, TYPOGRAPHY } from "../../lib/constants";
import { BridgeMindBoardView } from "../../components/mockups/BridgeMindBoardView";
import { GitHubSyncFlow } from "../../components/diagrams/GitHubSyncFlow";
import { ChatBubble } from "../../components/ui/ChatBubble";

export const Scene06_BridgeMind: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps: _fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.darkBg,
        fontFamily: TYPOGRAPHY.fontFamily.sans,
      }}
    >
      {/* Part 1: BridgeMind board view (0-350) */}
      <Sequence from={0} durationInFrames={350}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 30,
          }}
        >
          <div
            style={{
              fontSize: TYPOGRAPHY.fontSize["4xl"],
              fontWeight: 700,
              color: COLORS.textPrimary,
              opacity: interpolate(frame, [10, 30], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            BridgeMind Project Board
          </div>
          <BridgeMindBoardView delay={20} />
        </AbsoluteFill>
      </Sequence>

      {/* Part 2: GitHub sync flow diagram (350-700) */}
      <Sequence from={350} durationInFrames={350}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 40,
          }}
        >
          <div
            style={{
              fontSize: TYPOGRAPHY.fontSize["3xl"],
              fontWeight: 700,
              color: COLORS.textPrimary,
              opacity: interpolate(frame, [360, 380], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            Automatic Sync Pipeline
          </div>
          <GitHubSyncFlow delay={370} />
          <div
            style={{
              fontSize: TYPOGRAPHY.fontSize.lg,
              color: COLORS.textMuted,
              opacity: interpolate(frame, [500, 530], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            Every page tracked, every decision auditable
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Part 3: Chat bubbles showing audit trail (700-1050) */}
      <Sequence from={700} durationInFrames={350}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "60px 200px",
            gap: 8,
          }}
        >
          <div
            style={{
              fontSize: TYPOGRAPHY.fontSize["2xl"],
              fontWeight: 700,
              color: COLORS.textPrimary,
              marginBottom: 30,
              opacity: interpolate(frame, [710, 730], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            Audit Trail
          </div>
          <ChatBubble
            message="Generated /games/tetris via route-agent-v3"
            isAi
            delay={720}
            typingSpeed={50}
          />
          <ChatBubble
            message="Plan approved by Reviewer A (ELO: 1650)"
            isAi
            delay={790}
            typingSpeed={50}
          />
          <ChatBubble
            message="Code approved by Reviewer B (ELO: 1420)"
            isAi
            delay={860}
            typingSpeed={50}
          />
          <ChatBubble
            message="Transpiled and cached. Ticket #247 closed."
            isAi
            delay={930}
            typingSpeed={50}
          />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
