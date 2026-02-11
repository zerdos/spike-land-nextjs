import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, SPRING_CONFIGS, VERITASIUM_COLORS } from "../../lib/constants";
import { AgentLoopDiagram } from "../../components/diagrams";

const EC = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

// Active state sequence: planning(0) → generating(1) → transpiling(2) → verifying(3) → fixing(4)
// → learning(5) → generating(1) → transpiling(2) → verifying(3) → published(6)
const LOOP_SEQUENCE = [0, 1, 2, 3, 4, 5, 1, 2, 3, 6];
const FRAMES_PER_STATE = 50;

export const Scene03_Solution: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- Section 1: Title + Diagram Build (0-400f) ---
  const titleOpacity = interpolate(frame, [0, 30], [0, 1], EC);
  const titleSlide = interpolate(frame, [0, 30], [30, 0], EC);
  const statesRevealed = Math.min(7, Math.floor((frame - 60) / 50) + 1);
  const section1Opacity = interpolate(frame, [360, 400], [1, 0], EC);

  // --- Section 2: Loop in Action (400-900f) ---
  const section2Opacity = interpolate(frame, [400, 430, 870, 900], [0, 1, 1, 0], EC);
  const loopFrame = frame - 400;
  const stateIndex = Math.min(
    LOOP_SEQUENCE.length - 1,
    Math.max(0, Math.floor(loopFrame / FRAMES_PER_STATE))
  );
  const activeState = frame >= 400 && frame < 900 ? LOOP_SEQUENCE[stateIndex] : -1;

  // Status label for the current loop step
  const loopLabels = [
    "Planning the component...",
    "Generating code...",
    "Transpiling with esbuild...",
    "Verifying output...",
    "Error found — fixing...",
    "Saving what we learned...",
    "Regenerating with fix...",
    "Transpiling again...",
    "Verifying — success!",
    "Published!",
  ];
  const currentLabel = frame >= 400 && frame < 900 ? loopLabels[stateIndex] : "";
  const isError = stateIndex === 4;
  const isSuccess = stateIndex >= 8;

  // --- Section 3: Zoom out + text (900-1200f) ---
  const section3Opacity = interpolate(frame, [900, 930, 1170, 1200], [0, 1, 1, 0], EC);
  const diagramScale3 = interpolate(frame, [900, 1050], [0.85, 0.6], EC);
  const insightY = interpolate(frame, [1000, 1060], [40, 0], EC);
  const insightOpacity = interpolate(frame, [1000, 1060], [0, 1], EC);

  // --- Section 4: Database / Knowledge Base (1200-1600f) ---
  const section4Opacity = interpolate(frame, [1200, 1240, 1560, 1600], [0, 1, 1, 0], EC);
  const dbPulse = 1 + Math.sin(frame / 12) * 0.06;
  const dbGlow = 12 + Math.sin(frame / 10) * 8;

  // Floating notes entering the database
  const noteTexts = [
    "TypeError: x is not a function",
    "Fix: import default export",
    "Pattern: validate props first",
    "Error: missing dependency",
  ];

  // --- Section 5: Assembly line analogy (1600-1800f) ---
  const section5Opacity = interpolate(frame, [1600, 1640], [0, 1], EC);
  const analogySpring = spring({ frame: frame - 1640, fps, config: SPRING_CONFIGS.smooth });

  return (
    <AbsoluteFill style={{ background: COLORS.darkBg }}>
      {/* Section 1: Title + Progressive Diagram Build (0-400f) */}
      {frame < 400 && (
        <AbsoluteFill style={{ opacity: section1Opacity }}>
          {/* Title */}
          <div style={{
            position: "absolute",
            top: 40,
            left: 0,
            right: 0,
            textAlign: "center",
            opacity: titleOpacity,
            transform: `translateY(${titleSlide}px)`,
          }}>
            <span style={{
              fontSize: 52,
              fontWeight: 800,
              fontFamily: "Inter, sans-serif",
              background: `linear-gradient(135deg, ${VERITASIUM_COLORS.planning}, ${COLORS.cyan})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              The Agent Loop
            </span>
          </div>

          {/* Diagram building step by step */}
          <div style={{
            position: "absolute",
            top: 80,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <AgentLoopDiagram
              revealCount={frame >= 60 ? statesRevealed : 0}
              scale={0.85}
            />
          </div>
        </AbsoluteFill>
      )}

      {/* Section 2: Loop in Action (400-900f) */}
      {frame >= 400 && frame < 900 && (
        <AbsoluteFill style={{ opacity: section2Opacity }}>
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 120,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <AgentLoopDiagram
              revealCount={7}
              activeState={activeState}
              showLoop={true}
              scale={0.85}
            />
          </div>

          {/* Status bar at bottom */}
          <div style={{
            position: "absolute",
            bottom: 40,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
          }}>
            <div style={{
              padding: "14px 40px",
              borderRadius: 16,
              background: isError
                ? `${VERITASIUM_COLORS.failed}20`
                : isSuccess
                  ? `${VERITASIUM_COLORS.published}20`
                  : `${COLORS.darkCard}`,
              border: `1px solid ${
                isError
                  ? VERITASIUM_COLORS.failed
                  : isSuccess
                    ? VERITASIUM_COLORS.published
                    : COLORS.darkBorder
              }60`,
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 18,
              color: isError
                ? VERITASIUM_COLORS.failed
                : isSuccess
                  ? VERITASIUM_COLORS.published
                  : COLORS.textPrimary,
              fontWeight: 500,
            }}>
              {currentLabel}
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* Section 3: Zoom Out + Insight (900-1200f) */}
      {frame >= 900 && frame < 1200 && (
        <AbsoluteFill style={{ opacity: section3Opacity }}>
          {/* Shrinking diagram */}
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "60%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <AgentLoopDiagram
              revealCount={7}
              showLoop={true}
              scale={diagramScale3}
            />
          </div>

          {/* Insight text */}
          <div style={{
            position: "absolute",
            bottom: 120,
            left: 0,
            right: 0,
            textAlign: "center",
            opacity: insightOpacity,
            transform: `translateY(${insightY}px)`,
          }}>
            <span style={{
              fontSize: 42,
              fontWeight: 700,
              fontFamily: "Inter, sans-serif",
              color: COLORS.textPrimary,
            }}>
              But the loop itself is{" "}
              <span style={{ color: VERITASIUM_COLORS.fixing }}>not</span>{" "}
              the breakthrough.
            </span>
          </div>
        </AbsoluteFill>
      )}

      {/* Section 4: Database / Knowledge Base (1200-1600f) */}
      {frame >= 1200 && frame < 1600 && (
        <AbsoluteFill style={{ opacity: section4Opacity }}>
          {/* "The breakthrough is what happens after." */}
          <div style={{
            position: "absolute",
            top: 80,
            left: 0,
            right: 0,
            textAlign: "center",
            opacity: interpolate(frame, [1200, 1260], [0, 1], EC),
          }}>
            <span style={{
              fontSize: 40,
              fontWeight: 700,
              fontFamily: "Inter, sans-serif",
              background: `linear-gradient(135deg, ${VERITASIUM_COLORS.learning}, ${COLORS.cyan})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              The breakthrough is what happens after.
            </span>
          </div>

          {/* Database icon - center pulsing */}
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
              transform: `scale(${dbPulse * interpolate(frame, [1280, 1350], [0.3, 1], EC)})`,
            }}>
              {/* DB cylinder icon */}
              <svg width={140} height={160} viewBox="0 0 140 160">
                <ellipse cx={70} cy={30} rx={60} ry={20}
                  fill={`${VERITASIUM_COLORS.learning}30`}
                  stroke={VERITASIUM_COLORS.learning}
                  strokeWidth={2}
                />
                <rect x={10} y={30} width={120} height={100}
                  fill={`${VERITASIUM_COLORS.learning}15`}
                />
                <line x1={10} y1={30} x2={10} y2={130}
                  stroke={VERITASIUM_COLORS.learning} strokeWidth={2}
                />
                <line x1={130} y1={30} x2={130} y2={130}
                  stroke={VERITASIUM_COLORS.learning} strokeWidth={2}
                />
                <ellipse cx={70} cy={130} rx={60} ry={20}
                  fill={`${VERITASIUM_COLORS.learning}30`}
                  stroke={VERITASIUM_COLORS.learning}
                  strokeWidth={2}
                />
                {/* Glow filter */}
                <ellipse cx={70} cy={80} rx={40} ry={50}
                  fill="none"
                  stroke={VERITASIUM_COLORS.learning}
                  strokeWidth={0.5}
                  opacity={0.3}
                  filter={`drop-shadow(0 0 ${dbGlow}px ${VERITASIUM_COLORS.learning})`}
                />
              </svg>

              <span style={{
                fontSize: 22,
                fontWeight: 700,
                fontFamily: "Inter, sans-serif",
                color: VERITASIUM_COLORS.learning,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}>
                Knowledge Base
              </span>
            </div>
          </div>

          {/* Floating notes entering the database */}
          {noteTexts.map((text, i) => {
            const noteDelay = 1320 + i * 70;
            const noteProgress = interpolate(frame, [noteDelay, noteDelay + 60], [0, 1], EC);
            const noteOpacity = interpolate(frame, [noteDelay, noteDelay + 15, noteDelay + 45, noteDelay + 60], [0, 1, 1, 0], EC);
            const startX = i % 2 === 0 ? -300 : 300;
            const startY = i < 2 ? -150 : 150;
            const noteX = interpolate(noteProgress, [0, 1], [startX, 0], EC);
            const noteY = interpolate(noteProgress, [0, 1], [startY, 0], EC);
            const noteScale = interpolate(noteProgress, [0, 0.5, 1], [0.8, 1, 0.3], EC);

            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: `translate(calc(-50% + ${noteX}px), calc(-50% + ${noteY}px)) scale(${noteScale})`,
                  opacity: noteOpacity,
                  padding: "10px 20px",
                  borderRadius: 10,
                  background: `${VERITASIUM_COLORS.candidate}15`,
                  border: `1px solid ${VERITASIUM_COLORS.candidate}50`,
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 14,
                  color: VERITASIUM_COLORS.candidate,
                  whiteSpace: "nowrap",
                }}
              >
                {text}
              </div>
            );
          })}
        </AbsoluteFill>
      )}

      {/* Section 5: Assembly Line Analogy (1600-1800f) */}
      {frame >= 1600 && (
        <AbsoluteFill style={{
          opacity: section5Opacity,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 80,
        }}>
          <div style={{
            maxWidth: 1200,
            textAlign: "center",
            transform: `scale(${analogySpring})`,
          }}>
            <div style={{
              fontSize: 42,
              fontWeight: 700,
              fontFamily: "Inter, sans-serif",
              lineHeight: 1.5,
              color: COLORS.textPrimary,
            }}>
              An assembly line with{" "}
              <span style={{
                background: `linear-gradient(135deg, ${COLORS.cyan}, ${VERITASIUM_COLORS.transpiling})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
                quality control
              </span>
              {" "}&mdash;{" "}
              <br />
              broken parts go back with a note saying{" "}
              <span style={{
                background: `linear-gradient(135deg, ${VERITASIUM_COLORS.fixing}, ${VERITASIUM_COLORS.candidate})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
                exactly what&apos;s wrong
              </span>
              .
            </div>

            {/* Decorative accent line */}
            <div style={{
              marginTop: 40,
              height: 3,
              width: interpolate(frame, [1680, 1780], [0, 600], EC),
              background: `linear-gradient(90deg, transparent, ${COLORS.cyan}, ${VERITASIUM_COLORS.transpiling}, transparent)`,
              margin: "40px auto 0",
              borderRadius: 2,
            }} />
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
