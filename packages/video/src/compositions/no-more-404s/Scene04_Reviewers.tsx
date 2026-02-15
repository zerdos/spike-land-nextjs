import React from "react";
import {
  AbsoluteFill,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, SPRING_CONFIGS, TYPOGRAPHY } from "../../lib/constants";
import { typewriter } from "../../lib/animations";
import { KineticText } from "../../components/ui/KineticText";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { GlassmorphismCard } from "../../components/ui/GlassmorphismCard";
import { BrowserFrame } from "../../components/mockups/BrowserFrame";

const WIKI_ARTICLE = `# Quantum Computing

Quantum computing uses quantum-mechanical phenomena such as superposition and entanglement to perform computation. Unlike classical bits that are 0 or 1, quantum bits (qubits) can exist in multiple states simultaneously.

## Key Concepts

- **Superposition**: A qubit can be in a combination of both 0 and 1 states
- **Entanglement**: Qubits can be correlated in ways impossible classically
- **Quantum Gates**: Operations that manipulate qubit states`;

const TOPICS = [
  { title: "Python Lambda Functions", color: COLORS.cyan, delay: 360 },
  { title: "Byzantine Fault Tolerance", color: COLORS.purple, delay: 380 },
  { title: "Quantum Computing", color: COLORS.amber, delay: 400 },
] as const;

export const Scene04_LearnIT: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.darkBg,
        fontFamily: TYPOGRAPHY.fontFamily.sans,
      }}
    >
      {/* Part 1: Browser frame with wiki article (0-350) */}
      <Sequence from={0} durationInFrames={350}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 60,
            gap: 30,
          }}
        >
          <KineticText
            text="LearnIT Wiki"
            fontSize={64}
            color={COLORS.textPrimary}
            type="reveal"
            delay={0}
          />

          <div style={{ width: 900, height: 700 }}>
            <BrowserFrame
              url="spike.land/learn/quantum-computing"
              width="100%"
              height="100%"
            >
              <div style={{ position: "relative", padding: 24 }}>
                {/* Status badge in top-right */}
                <div
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                  }}
                >
                  <StatusBadge status="generating" delay={40} />
                </div>

                {/* Wiki article with typewriter effect */}
                <div
                  style={{
                    fontSize: 16,
                    lineHeight: 1.7,
                    color: COLORS.textSecondary,
                    fontFamily: TYPOGRAPHY.fontFamily.sans,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {typewriter(frame, fps, WIKI_ARTICLE, 40, 30)}
                  <span
                    style={{
                      opacity: Math.sin(frame * 0.3) > 0 ? 1 : 0,
                      color: COLORS.cyan,
                    }}
                  >
                    |
                  </span>
                </div>
              </div>
            </BrowserFrame>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Part 2: Topic cards (350-700) */}
      <Sequence from={350} durationInFrames={350}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 24,
          }}
        >
          {TOPICS.map((topic) => (
            <GlassmorphismCard
              key={topic.title}
              width={800}
              color={topic.color}
              delay={topic.delay}
            >
              <div style={{ padding: "20px 28px" }}>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: COLORS.textPrimary,
                  }}
                >
                  {topic.title}
                </div>
                <div
                  style={{
                    fontSize: 16,
                    color: COLORS.textMuted,
                    marginTop: 6,
                  }}
                >
                  Generated article
                </div>
              </div>
            </GlassmorphismCard>
          ))}
        </AbsoluteFill>
      </Sequence>

      {/* Part 3: Closing text (700-1050) */}
      <Sequence from={700} durationInFrames={350}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
          }}
        >
          <KineticText
            text="Every piece of content"
            fontSize={56}
            color={COLORS.textPrimary}
            type="reveal"
            delay={720}
          />
          <KineticText
            text="is generated, not curated"
            fontSize={64}
            color={COLORS.cyan}
            type="scale"
            delay={790}
          />
          <div
            style={{
              marginTop: 30,
              fontSize: 22,
              color: COLORS.textMuted,
              fontWeight: 500,
              opacity: spring({
                frame: frame - 870,
                fps,
                config: SPRING_CONFIGS.smooth,
              }),
            }}
          >
            MDX &bull; Syntax Highlighting &bull; Text-to-Speech
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
