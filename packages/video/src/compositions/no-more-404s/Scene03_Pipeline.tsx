import React from "react";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, TYPOGRAPHY } from "../../lib/constants";
import { typewriter } from "../../lib/animations";
import { BrowserFrame } from "../../components/mockups/BrowserFrame";
import { RoutePipelineDiagram } from "../../components/diagrams/RoutePipelineDiagram";
import { CodeBlock } from "../../components/ui/CodeBlock";

const GENERATED_CODE = `import React, { useState, useEffect } from "react";

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;

export default function Tetris() {
  const [board, setBoard] = useState(
    Array.from({ length: BOARD_HEIGHT },
      () => Array(BOARD_WIDTH).fill(0))
  );
  const [score, setScore] = useState(0);

  useEffect(() => {
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="tetris-board">
      {board.map((row, y) => (
        <div key={y} className="row">
          {row.map((cell, x) => (
            <div key={x} className={\`cell \${cell}\`} />
          ))}
        </div>
      ))}
      <div>Score: {score}</div>
    </div>
  );
}`;

export const Scene03_Pipeline: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const analysisUrl = "spike.land/games/tetris";
  const visibleAnalysisUrl = typewriter(frame, fps, analysisUrl, 25, 20);

  // Pipeline reveal count based on frame
  const pipelineReveal = Math.min(
    6,
    Math.floor(
      interpolate(frame, [500, 900], [0, 6], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
    ),
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.darkBg,
        fontFamily: TYPOGRAPHY.fontFamily.sans,
      }}
    >
      {/* Part 1: Browser frame showing URL analysis (0-500) */}
      <Sequence from={0} durationInFrames={500}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 40,
            padding: 60,
          }}
        >
          <BrowserFrame url={visibleAnalysisUrl} width={1200} height={200}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                padding: 30,
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  color: COLORS.cyan,
                  fontFamily: TYPOGRAPHY.fontFamily.mono,
                  opacity: interpolate(frame, [100, 130], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                }}
              >
                {"/games/tetris"}
                <span style={{ color: COLORS.textMuted }}>{" → "}</span>
                <span style={{ color: COLORS.success }}>Build a game</span>
              </div>
            </div>
          </BrowserFrame>

          {/* Analysis labels appearing */}
          <div
            style={{
              display: "flex",
              gap: 30,
            }}
          >
            {[
              { label: "Category: Game", delay: 150, color: COLORS.cyan },
              { label: "Type: Tetris", delay: 200, color: COLORS.purple },
              { label: "Framework: React", delay: 250, color: COLORS.amber },
            ].map((tag, i) => (
              <div
                key={i}
                style={{
                  padding: "12px 24px",
                  borderRadius: 12,
                  background: `${tag.color}15`,
                  border: `1px solid ${tag.color}50`,
                  fontSize: TYPOGRAPHY.fontSize.lg,
                  fontWeight: 600,
                  color: tag.color,
                  fontFamily: TYPOGRAPHY.fontFamily.mono,
                  opacity: interpolate(
                    frame,
                    [tag.delay, tag.delay + 20],
                    [0, 1],
                    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
                  ),
                  transform: `translateY(${interpolate(
                    frame,
                    [tag.delay, tag.delay + 20],
                    [15, 0],
                    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
                  )}px)`,
                }}
              >
                {tag.label}
              </div>
            ))}
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Part 2: Pipeline diagram revealing steps (500-1000) */}
      <Sequence from={500} durationInFrames={500}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 60,
          }}
        >
          <div
            style={{
              fontSize: TYPOGRAPHY.fontSize["4xl"],
              fontWeight: 700,
              color: COLORS.textPrimary,
              opacity: interpolate(frame, [510, 540], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            The Route Pipeline
          </div>
          <RoutePipelineDiagram revealCount={pipelineReveal} delay={520} />
        </AbsoluteFill>
      </Sequence>

      {/* Part 3: Generated code with typewriter (1000-1500) */}
      <Sequence from={1000} durationInFrames={500}>
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
          <div
            style={{
              fontSize: TYPOGRAPHY.fontSize["2xl"],
              fontWeight: 700,
              color: COLORS.textSecondary,
              opacity: interpolate(frame, [1010, 1030], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            Generated React Code
          </div>
          <div style={{ width: 1000 }}>
            <CodeBlock
              code={GENERATED_CODE}
              language="tsx"
              borderColor={COLORS.cyan}
              delay={1020}
              typingSpeed={60}
            />
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
