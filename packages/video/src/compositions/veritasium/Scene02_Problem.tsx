import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, SPRING_CONFIGS, VERITASIUM_COLORS } from "../../lib/constants";
import { SingleShotDiagram } from "../../components/diagrams";

const EC = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

const ERROR_MESSAGES = [
  { text: "TypeError: Cannot read properties of undefined (reading 'map')", line: "app.tsx:42" },
  { text: "Error: Hydration failed because the initial UI does not match", line: "layout.tsx:18" },
  { text: "ReferenceError: window is not defined", line: "utils.ts:7" },
  { text: "SyntaxError: Unexpected token '<'", line: "parser.ts:134" },
];

const DAYS = ["Monday", "Wednesday", "Friday"];

export const Scene02_Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- Sub-section opacities ---
  // 0-300: SingleShotDiagram
  const diagramOpacity = interpolate(frame, [0, 30, 270, 300], [0, 1, 1, 0], EC);
  // 300-500: Error montage
  const errorsOpacity = interpolate(frame, [300, 320, 470, 500], [0, 1, 1, 0], EC);
  // 500-700: Calendar repetition
  const calendarOpacity = interpolate(frame, [500, 520, 670, 700], [0, 1, 1, 0], EC);
  // 700-780: Doctor analogy
  const doctorOpacity = interpolate(frame, [700, 720, 760, 780], [0, 1, 1, 0], EC);
  // 780-840: Trash can / golden question
  const trashOpacity = interpolate(frame, [780, 800, 840, 840], [0, 1, 1, 1], EC);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.darkBg,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* === Section 1: Single-Shot Diagram (0-300f) === */}
      {frame < 300 && (
        <AbsoluteFill
          style={{
            opacity: diagramOpacity,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: COLORS.textSecondary,
              letterSpacing: 4,
              textTransform: "uppercase",
              marginBottom: 12,
              opacity: interpolate(frame, [0, 40], [0, 1], EC),
            }}
          >
            Traditional AI Code Generation
          </div>
          <SingleShotDiagram delay={20} attemptCount={10} />
          <div
            style={{
              fontSize: 20,
              color: COLORS.textMuted,
              marginTop: 8,
              opacity: interpolate(frame, [120, 150], [0, 1], EC),
            }}
          >
            One prompt. One response. Pray it compiles.
          </div>
        </AbsoluteFill>
      )}

      {/* === Section 2: Error Montage (300-500f) === */}
      {frame >= 300 && frame < 500 && (
        <AbsoluteFill
          style={{
            opacity: errorsOpacity,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
            padding: 80,
          }}
        >
          {ERROR_MESSAGES.map((err, i) => {
            const entryDelay = 310 + i * 25;
            const itemSpring = spring({
              frame: frame - entryDelay,
              fps,
              config: SPRING_CONFIGS.snappy,
            });
            const shake =
              frame >= entryDelay && frame < entryDelay + 8
                ? Math.sin((frame - entryDelay) * 3) * 4
                : 0;

            return (
              <div
                key={i}
                style={{
                  width: "100%",
                  maxWidth: 900,
                  padding: "16px 24px",
                  borderRadius: 8,
                  background: `${VERITASIUM_COLORS.failed}12`,
                  border: `1px solid ${VERITASIUM_COLORS.failed}40`,
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 18,
                  color: VERITASIUM_COLORS.failed,
                  opacity: interpolate(itemSpring, [0, 1], [0, 1]),
                  transform: `translateX(${shake}px) scale(${interpolate(itemSpring, [0, 1], [0.9, 1])})`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>{err.text}</span>
                <span
                  style={{
                    fontSize: 14,
                    color: COLORS.textMuted,
                    marginLeft: 16,
                    whiteSpace: "nowrap",
                  }}
                >
                  {err.line}
                </span>
              </div>
            );
          })}
          {/* "No memory" label */}
          <div
            style={{
              marginTop: 20,
              fontSize: 24,
              fontWeight: 600,
              color: COLORS.textMuted,
              opacity: interpolate(frame, [420, 450], [0, 1], EC),
              letterSpacing: 2,
            }}
          >
            No memory. No learning. No improvement.
          </div>
        </AbsoluteFill>
      )}

      {/* === Section 3: Recurring Errors Calendar (500-700f) === */}
      {frame >= 500 && frame < 700 && (
        <AbsoluteFill
          style={{
            opacity: calendarOpacity,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 40,
          }}
        >
          <div
            style={{
              fontSize: 26,
              fontWeight: 600,
              color: COLORS.textSecondary,
              opacity: interpolate(frame, [500, 530], [0, 1], EC),
            }}
          >
            Same error. Every time.
          </div>

          <div
            style={{
              display: "flex",
              gap: 40,
              alignItems: "stretch",
            }}
          >
            {DAYS.map((day, i) => {
              const cardDelay = 530 + i * 35;
              const cardSpring = spring({
                frame: frame - cardDelay,
                fps,
                config: SPRING_CONFIGS.snappy,
              });

              return (
                <div
                  key={day}
                  style={{
                    width: 320,
                    borderRadius: 16,
                    overflow: "hidden",
                    border: `2px solid ${VERITASIUM_COLORS.failed}50`,
                    background: `${COLORS.darkCard}`,
                    transform: `scale(${interpolate(cardSpring, [0, 1], [0.8, 1])})`,
                    opacity: interpolate(cardSpring, [0, 1], [0, 1]),
                    boxShadow: `0 8px 32px ${VERITASIUM_COLORS.failed}15`,
                  }}
                >
                  {/* Day header */}
                  <div
                    style={{
                      padding: "14px 20px",
                      background: `${VERITASIUM_COLORS.failed}20`,
                      borderBottom: `1px solid ${VERITASIUM_COLORS.failed}30`,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: VERITASIUM_COLORS.failed,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: COLORS.textPrimary,
                      }}
                    >
                      {day}
                    </span>
                  </div>
                  {/* Error content */}
                  <div style={{ padding: "16px 20px" }}>
                    <div
                      style={{
                        fontFamily: "JetBrains Mono, monospace",
                        fontSize: 13,
                        color: VERITASIUM_COLORS.failed,
                        lineHeight: 1.5,
                      }}
                    >
                      TypeError: Cannot read
                      <br />
                      properties of undefined
                      <br />
                      (reading &apos;map&apos;)
                    </div>
                    <div
                      style={{
                        marginTop: 12,
                        fontSize: 12,
                        color: COLORS.textMuted,
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      app.tsx:42
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      )}

      {/* === Section 4: Doctor Analogy (700-780f) === */}
      {frame >= 700 && frame < 780 && (
        <AbsoluteFill
          style={{
            opacity: doctorOpacity,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              maxWidth: 1200,
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 24,
            }}
          >
            <div
              style={{
                fontSize: 64,
                fontWeight: 700,
                color: COLORS.textPrimary,
                lineHeight: 1.3,
                opacity: interpolate(frame, [700, 725], [0, 1], EC),
                transform: `translateY(${interpolate(frame, [700, 725], [20, 0], EC)}px)`,
              }}
            >
              Imagine a doctor who forgets
              <br />
              everything between patients.
            </div>
            <div
              style={{
                fontSize: 28,
                color: COLORS.textMuted,
                opacity: interpolate(frame, [740, 760], [0, 1], EC),
              }}
            >
              That&apos;s every AI coding tool today.
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* === Section 5: Trash Can Revelation (780-840f) === */}
      {frame >= 780 && (
        <AbsoluteFill
          style={{
            opacity: trashOpacity,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 40,
            }}
          >
            {/* Trash can with light spilling out */}
            <div
              style={{
                position: "relative",
                width: 120,
                height: 140,
              }}
            >
              {/* Glow behind the can */}
              <div
                style={{
                  position: "absolute",
                  top: -30,
                  left: -40,
                  width: 200,
                  height: 200,
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${COLORS.amber}30, transparent 70%)`,
                  opacity: interpolate(frame, [795, 820], [0, 1], EC),
                  filter: "blur(20px)",
                }}
              />

              {/* Trash can body */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 10,
                  width: 100,
                  height: 100,
                  borderRadius: "0 0 12px 12px",
                  border: `3px solid ${COLORS.textMuted}`,
                  borderTop: "none",
                  background: `${COLORS.darkCard}`,
                }}
              />
              {/* Trash can lid - cracked open */}
              {(() => {
                const lidAngle = interpolate(frame, [790, 815], [0, -35], EC);
                return (
                  <div
                    style={{
                      position: "absolute",
                      top: 24,
                      left: 2,
                      width: 116,
                      height: 10,
                      borderRadius: 6,
                      background: COLORS.textMuted,
                      transformOrigin: "left center",
                      transform: `rotate(${lidAngle}deg)`,
                    }}
                  />
                );
              })()}
              {/* Lid handle */}
              <div
                style={{
                  position: "absolute",
                  top: 14,
                  left: 42,
                  width: 36,
                  height: 10,
                  borderRadius: "6px 6px 0 0",
                  background: COLORS.textMuted,
                }}
              />
              {/* Light rays from the crack */}
              {[...Array(5)].map((_, i) => {
                const angle = -30 + i * 15;
                const rayOpacity = interpolate(frame, [810, 830], [0, 0.6], EC);
                return (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      top: 10,
                      left: 55,
                      width: 3,
                      height: 50 + i * 10,
                      background: `linear-gradient(to top, ${COLORS.amber}, transparent)`,
                      transformOrigin: "bottom center",
                      transform: `rotate(${angle}deg)`,
                      opacity: rayOpacity,
                      borderRadius: 2,
                    }}
                  />
                );
              })}
            </div>

            {/* Golden question text */}
            <div
              style={{
                maxWidth: 900,
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  fontSize: 52,
                  fontWeight: 700,
                  lineHeight: 1.3,
                  opacity: interpolate(frame, [810, 830], [0, 1], EC),
                  transform: `translateY(${interpolate(frame, [810, 830], [15, 0], EC)}px)`,
                  background: `linear-gradient(135deg, ${COLORS.amber}, ${COLORS.gold})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                What if the failures were
                <br />
                the most valuable part?
              </div>
              {/* Subtle amber glow */}
              <div
                style={{
                  width: 500,
                  height: 4,
                  borderRadius: 2,
                  marginTop: 12,
                  background: `linear-gradient(90deg, transparent, ${COLORS.amber}60, transparent)`,
                  opacity: interpolate(frame, [825, 840], [0, 1], EC),
                }}
              />
            </div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
