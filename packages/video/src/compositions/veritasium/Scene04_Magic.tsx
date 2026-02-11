import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  COLORS,
  SPRING_CONFIGS,
  VERITASIUM_COLORS,
} from "../../lib/constants";
import { LearningNoteCard, NoteLifecycle } from "../../components/diagrams";

const EC = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

export const Scene04_Magic: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- Section 1: Learning Note Card (0-400f) ---
  const s1Opacity = interpolate(frame, [0, 30, 360, 400], [0, 1, 1, 0], EC);

  // --- Section 2: Note Lifecycle (400-800f) ---
  const s2Frame = frame - 400;
  const s2Opacity = interpolate(
    frame,
    [400, 430, 760, 800],
    [0, 1, 1, 0],
    EC,
  );
  const revealCount = s2Frame < 80 ? 1 : s2Frame < 160 ? 2 : 3;
  const activeStage =
    s2Frame < 120 ? 0 : s2Frame < 240 ? 1 : s2Frame < 340 ? 2 : -1;

  // --- Section 3: Laplace Moment (800-1100f) ---
  const s3Frame = frame - 800;
  const s3Opacity = interpolate(
    frame,
    [800, 830, 1060, 1100],
    [0, 1, 1, 0],
    EC,
  );
  const laplaceTitle = spring({
    frame: s3Frame,
    fps,
    config: SPRING_CONFIGS.heavy,
  });
  const laplaceQuote = spring({
    frame: s3Frame - 40,
    fps,
    config: SPRING_CONFIGS.smooth,
  });
  const laplaceFormula = spring({
    frame: s3Frame - 100,
    fps,
    config: SPRING_CONFIGS.snappy,
  });

  // --- Section 4: Split Screen Comparison (1100-1500f) ---
  const s4Frame = frame - 1100;
  const s4Opacity = interpolate(
    frame,
    [1100, 1130, 1460, 1500],
    [0, 1, 1, 0],
    EC,
  );
  const leftSlide = spring({
    frame: s4Frame,
    fps,
    config: SPRING_CONFIGS.snappy,
  });
  const rightSlide = spring({
    frame: s4Frame - 20,
    fps,
    config: SPRING_CONFIGS.snappy,
  });
  // Red flash pulses for "retries"
  const retryFlash1 =
    s4Frame > 60 && s4Frame < 80 ? Math.sin((s4Frame - 60) * 0.5) * 0.6 : 0;
  const retryFlash2 =
    s4Frame > 100 && s4Frame < 120
      ? Math.sin((s4Frame - 100) * 0.5) * 0.6
      : 0;
  const retryFlash3 =
    s4Frame > 140 && s4Frame < 160
      ? Math.sin((s4Frame - 140) * 0.5) * 0.6
      : 0;
  const retryTotalFlash = Math.max(retryFlash1, retryFlash2, retryFlash3, 0);

  // Green glow for success
  const successGlow = spring({
    frame: s4Frame - 60,
    fps,
    config: SPRING_CONFIGS.bouncy,
  });

  // --- Section 5: Counter Animation (1500-1750f) ---
  const s5Frame = frame - 1500;
  const s5Opacity = interpolate(
    frame,
    [1500, 1530, 1710, 1750],
    [0, 1, 1, 0],
    EC,
  );
  const counterValue = Math.round(
    interpolate(s5Frame, [0, 50, 120, 200], [47, 128, 340, 1200], EC),
  );

  // --- Section 6: Analogy Text (1750-1950f) ---
  const s6Frame = frame - 1750;
  const s6Opacity = interpolate(
    frame,
    [1750, 1780, 1910, 1950],
    [0, 1, 1, 0],
    EC,
  );

  const analogyLine1 = spring({
    frame: s6Frame,
    fps,
    config: SPRING_CONFIGS.smooth,
  });
  const analogyLine2 = spring({
    frame: s6Frame - 30,
    fps,
    config: SPRING_CONFIGS.smooth,
  });
  const analogyLine3 = spring({
    frame: s6Frame - 60,
    fps,
    config: SPRING_CONFIGS.smooth,
  });

  return (
    <AbsoluteFill
      style={{
        background: COLORS.darkBg,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* Section 1: Learning Note Card (0-400f) */}
      {frame < 400 && (
        <AbsoluteFill
          style={{
            opacity: s1Opacity,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 40,
          }}
        >
          <div
            style={{
              fontSize: 42,
              fontWeight: 700,
              color: COLORS.textPrimary,
              textAlign: "center",
              opacity: interpolate(frame, [0, 30], [0, 1], EC),
              transform: `translateY(${interpolate(frame, [0, 30], [20, 0], EC)}px)`,
            }}
          >
            Every error produces a{" "}
            <span style={{ color: VERITASIUM_COLORS.learning }}>
              learning note
            </span>
          </div>
          <LearningNoteCard
            pattern="emotion/styled import fails"
            solution="Use @emotion/styled instead"
            confidence={0.87}
            status="ACTIVE"
            timesApplied={23}
            delay={30}
          />
        </AbsoluteFill>
      )}

      {/* Section 2: Note Lifecycle (400-800f) */}
      {frame >= 400 && frame < 800 && (
        <AbsoluteFill
          style={{
            opacity: s2Opacity,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 60,
          }}
        >
          <NoteLifecycle
            revealCount={revealCount}
            activeStage={activeStage}
            delay={0}
          />
          <div
            style={{
              maxWidth: 800,
              textAlign: "center",
              fontSize: 22,
              lineHeight: 1.6,
              color: COLORS.textSecondary,
              opacity: interpolate(s2Frame, [80, 120], [0, 1], EC),
              transform: `translateY(${interpolate(s2Frame, [80, 120], [15, 0], EC)}px)`,
            }}
          >
            New notes start as{" "}
            <span
              style={{
                color: VERITASIUM_COLORS.candidate,
                fontWeight: 700,
              }}
            >
              CANDIDATES
            </span>
            . Help 3 times with &gt;60% success?{" "}
            <span
              style={{
                color: VERITASIUM_COLORS.active,
                fontWeight: 700,
              }}
            >
              Promoted to ACTIVE
            </span>
            . Drop below 30%?{" "}
            <span
              style={{
                color: VERITASIUM_COLORS.deprecated,
                fontWeight: 700,
              }}
            >
              DEPRECATED
            </span>
            .
          </div>
        </AbsoluteFill>
      )}

      {/* Section 3: Laplace Moment (800-1100f) */}
      {frame >= 800 && frame < 1100 && (
        <AbsoluteFill
          style={{
            opacity: s3Opacity,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 40,
          }}
        >
          {/* "250 Years Old" title with violet glow */}
          <div
            style={{
              fontSize: 80,
              fontWeight: 900,
              color: VERITASIUM_COLORS.bayesian,
              textAlign: "center",
              opacity: laplaceTitle,
              transform: `scale(${interpolate(laplaceTitle, [0, 1], [0.8, 1])})`,
              filter: `drop-shadow(0 0 30px ${VERITASIUM_COLORS.bayesian}60)`,
              letterSpacing: "-0.02em",
            }}
          >
            250 Years Old
          </div>

          {/* Quote */}
          <div
            style={{
              fontSize: 28,
              color: COLORS.textSecondary,
              textAlign: "center",
              fontStyle: "italic",
              maxWidth: 700,
              opacity: laplaceQuote,
              transform: `translateY(${interpolate(laplaceQuote, [0, 1], [20, 0])}px)`,
            }}
          >
            Laplace, 1774: &ldquo;Will the sun rise tomorrow?&rdquo;
          </div>

          {/* Formula */}
          <div
            style={{
              opacity: laplaceFormula,
              transform: `scale(${interpolate(laplaceFormula, [0, 1], [0.9, 1])})`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              marginTop: 20,
            }}
          >
            <div
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 40,
                fontWeight: 700,
                color: VERITASIUM_COLORS.bayesian,
                background: `${VERITASIUM_COLORS.bayesian}10`,
                border: `2px solid ${VERITASIUM_COLORS.bayesian}40`,
                borderRadius: 16,
                padding: "24px 48px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                boxShadow: `0 0 40px ${VERITASIUM_COLORS.bayesian}15`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ color: VERITASIUM_COLORS.learning }}>
                  successes
                </span>
                <span style={{ color: COLORS.textMuted }}>+</span>
                <span style={{ color: COLORS.textPrimary }}>1</span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: 3,
                  background: `linear-gradient(90deg, ${VERITASIUM_COLORS.bayesian}40, ${VERITASIUM_COLORS.bayesian}, ${VERITASIUM_COLORS.bayesian}40)`,
                  borderRadius: 2,
                }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ color: VERITASIUM_COLORS.learning }}>
                  successes
                </span>
                <span style={{ color: COLORS.textMuted }}>+</span>
                <span style={{ color: VERITASIUM_COLORS.failed }}>
                  failures
                </span>
                <span style={{ color: COLORS.textMuted }}>+</span>
                <span style={{ color: COLORS.textPrimary }}>2</span>
              </div>
            </div>
            <div
              style={{
                fontSize: 14,
                color: COLORS.textMuted,
                marginTop: 8,
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              Laplace Smoothing (Rule of Succession)
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* Section 4: Split Screen Comparison (1100-1500f) */}
      {frame >= 1100 && frame < 1500 && (
        <AbsoluteFill
          style={{
            opacity: s4Opacity,
            display: "flex",
            flexDirection: "row",
          }}
        >
          {/* LEFT: Without Notes */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 30,
              opacity: leftSlide,
              transform: `translateX(${interpolate(leftSlide, [0, 1], [-40, 0])}px)`,
              background: `rgba(239, 68, 68, ${retryTotalFlash * 0.08})`,
              transition: "background 0.1s",
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: VERITASIUM_COLORS.failed,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Without Notes
            </div>

            {/* Retry iterations */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                alignItems: "center",
              }}
            >
              {[1, 2, 3].map((attempt) => {
                const attemptDelay = 60 + (attempt - 1) * 40;
                const show = s4Frame > attemptDelay;
                const attemptOpacity = show
                  ? interpolate(
                      s4Frame,
                      [attemptDelay, attemptDelay + 15],
                      [0, 1],
                      EC,
                    )
                  : 0;
                return (
                  <div
                    key={attempt}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      opacity: attemptOpacity,
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        background: `${VERITASIUM_COLORS.failed}20`,
                        border: `2px solid ${VERITASIUM_COLORS.failed}80`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 22,
                        fontWeight: 700,
                        color: VERITASIUM_COLORS.failed,
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      {attempt}
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        color: COLORS.textMuted,
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      {attempt < 3 ? "FAILED" : "finally passed"}
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: VERITASIUM_COLORS.failed,
                marginTop: 20,
                opacity: interpolate(s4Frame, [180, 210], [0, 1], EC),
              }}
            >
              3 retries needed
            </div>
          </div>

          {/* Divider */}
          <div
            style={{
              width: 2,
              background: `linear-gradient(180deg, transparent, ${COLORS.darkBorder}, transparent)`,
              opacity: interpolate(s4Frame, [0, 30], [0, 1], EC),
            }}
          />

          {/* RIGHT: With Notes */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 30,
              opacity: rightSlide,
              transform: `translateX(${interpolate(rightSlide, [0, 1], [40, 0])}px)`,
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: VERITASIUM_COLORS.learning,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              With Notes
            </div>

            {/* Single success */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  background: `${VERITASIUM_COLORS.published}15`,
                  border: `3px solid ${VERITASIUM_COLORS.published}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 48,
                  boxShadow: `0 0 ${interpolate(successGlow, [0, 1], [0, 40])}px ${VERITASIUM_COLORS.published}50`,
                  transform: `scale(${interpolate(successGlow, [0, 1], [0.5, 1])})`,
                  opacity: successGlow,
                }}
              >
                <span
                  style={{
                    color: VERITASIUM_COLORS.published,
                    fontWeight: 900,
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  1
                </span>
              </div>
              <div
                style={{
                  fontSize: 16,
                  color: VERITASIUM_COLORS.published,
                  fontFamily: "JetBrains Mono, monospace",
                  fontWeight: 600,
                  opacity: successGlow,
                }}
              >
                PASSED first try
              </div>
            </div>

            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: VERITASIUM_COLORS.published,
                marginTop: 20,
                opacity: interpolate(s4Frame, [180, 210], [0, 1], EC),
              }}
            >
              0 retries
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* Section 5: Counter Animation (1500-1750f) */}
      {frame >= 1500 && frame < 1750 && (
        <AbsoluteFill
          style={{
            opacity: s5Opacity,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: COLORS.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
            }}
          >
            Learning Notes Accumulated
          </div>
          <div
            style={{
              fontSize: 160,
              fontWeight: 900,
              color: VERITASIUM_COLORS.learning,
              fontFamily: "JetBrains Mono, monospace",
              filter: `drop-shadow(0 0 40px ${VERITASIUM_COLORS.learning}40)`,
              letterSpacing: "-0.02em",
            }}
          >
            {counterValue.toLocaleString()}
          </div>
          <div
            style={{
              fontSize: 18,
              color: COLORS.textMuted,
              opacity: interpolate(s5Frame, [100, 130], [0, 1], EC),
            }}
          >
            and growing with every deployment
          </div>
        </AbsoluteFill>
      )}

      {/* Section 6: Analogy Text (1750-1950f) */}
      {frame >= 1750 && (
        <AbsoluteFill
          style={{
            opacity: s6Opacity,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 32,
            padding: "0 160px",
          }}
        >
          <div
            style={{
              fontSize: 30,
              fontWeight: 500,
              color: COLORS.textPrimary,
              textAlign: "center",
              lineHeight: 1.5,
              opacity: analogyLine1,
              transform: `translateY(${interpolate(analogyLine1, [0, 1], [20, 0])}px)`,
            }}
          >
            Every developer left behind{" "}
            <span
              style={{
                color: VERITASIUM_COLORS.learning,
                fontWeight: 700,
              }}
            >
              perfect notes
            </span>
            .
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 500,
              color: COLORS.textPrimary,
              textAlign: "center",
              lineHeight: 1.5,
              opacity: analogyLine2,
              transform: `translateY(${interpolate(analogyLine2, [0, 1], [20, 0])}px)`,
            }}
          >
            Every new hire reads them{" "}
            <span
              style={{
                color: VERITASIUM_COLORS.bayesian,
                fontWeight: 700,
              }}
            >
              on day one
            </span>
            .
          </div>
          <div
            style={{
              fontSize: 34,
              fontWeight: 700,
              color: COLORS.textPrimary,
              textAlign: "center",
              lineHeight: 1.5,
              opacity: analogyLine3,
              transform: `translateY(${interpolate(analogyLine3, [0, 1], [20, 0])}px)`,
            }}
          >
            The company{" "}
            <span
              style={{
                color: COLORS.cyan,
                fontWeight: 900,
              }}
            >
              never makes the same mistake twice
            </span>
            .
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
