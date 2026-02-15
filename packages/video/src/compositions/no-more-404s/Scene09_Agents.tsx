import React from "react";
import {
  AbsoluteFill,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, SPRING_CONFIGS, TYPOGRAPHY } from "../../lib/constants";
import { KineticText } from "../../components/ui/KineticText";
import { AgentRadialLayout } from "../../components/diagrams/AgentRadialLayout";

export const Scene09_Agents: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.darkBg,
        fontFamily: TYPOGRAPHY.fontFamily.sans,
      }}
    >
      {/* Part 1: Title + AgentRadialLayout (0-300) */}
      <Sequence from={0} durationInFrames={300}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            paddingTop: 120,
          }}
        >
          <KineticText
            text="This Video Was Built By"
            fontSize={56}
            color={COLORS.textPrimary}
            type="reveal"
            delay={10}
          />
          <div style={{ marginTop: 60 }}>
            <AgentRadialLayout delay={30} />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Part 2: Dependency lines animate in (300-600) */}
      <Sequence from={300} durationInFrames={300}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            paddingTop: 120,
          }}
        >
          <KineticText
            text="Eight Agents, One Video"
            fontSize={48}
            color={COLORS.cyan}
            type="scale"
            delay={310}
          />
          <div style={{ marginTop: 60 }}>
            <AgentRadialLayout delay={-270} />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Part 3: Meta moment (600-900) */}
      <Sequence from={600} durationInFrames={300}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 40,
          }}
        >
          <KineticText
            text="Orchestrate, don't operate"
            fontSize={64}
            color={COLORS.cyan}
            type="scale"
            delay={620}
          />
          <div
            style={{
              fontSize: TYPOGRAPHY.fontSize["2xl"],
              color: COLORS.textMuted,
              textAlign: "center",
              maxWidth: 800,
              lineHeight: 1.6,
              opacity: spring({
                frame: frame - 680,
                fps,
                config: SPRING_CONFIGS.smooth,
              }),
            }}
          >
            The same MCP architecture that powers spike.land
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
