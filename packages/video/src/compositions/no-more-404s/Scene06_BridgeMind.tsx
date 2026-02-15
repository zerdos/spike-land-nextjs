import React from "react";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, SPRING_CONFIGS, TYPOGRAPHY } from "../../lib/constants";
import { countUp } from "../../lib/animations";
import { KineticText } from "../../components/ui/KineticText";
import { GlassmorphismCard } from "../../components/ui/GlassmorphismCard";

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const beforeItems = ["Monolith", "Manual deploys", "Slow tests"];
const afterItems = ["40+ MCP Tools", "30 Categories", "Progressive Disclosure"];

export const Scene06_BridgeMind: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.darkBg,
        fontFamily: TYPOGRAPHY.fontFamily.sans,
      }}
    >
      {/* Part 1: Before/After comparison (0-350) */}
      <Sequence from={0} durationInFrames={350}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 40,
            padding: "60px 40px",
          }}
        >
          <KineticText
            text="BridgeMind × MCP"
            fontSize={TYPOGRAPHY.fontSize["5xl"]}
            type="reveal"
            delay={10}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: 30,
              marginTop: 40,
            }}
          >
            <GlassmorphismCard width={450} color={COLORS.error} delay={30}>
              <div style={{ padding: 30 }}>
                <div
                  style={{
                    fontSize: TYPOGRAPHY.fontSize["2xl"],
                    fontWeight: 700,
                    color: COLORS.error,
                    marginBottom: 20,
                  }}
                >
                  Before
                </div>
                {beforeItems.map((item, i) => (
                  <div
                    key={item}
                    style={{
                      fontSize: TYPOGRAPHY.fontSize.xl,
                      color: COLORS.textSecondary,
                      marginBottom: 12,
                      opacity: interpolate(
                        frame,
                        [50 + i * 15, 65 + i * 15],
                        [0, 1],
                        CLAMP,
                      ),
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </GlassmorphismCard>

            <GlassmorphismCard width={450} color={COLORS.success} delay={50}>
              <div style={{ padding: 30 }}>
                <div
                  style={{
                    fontSize: TYPOGRAPHY.fontSize["2xl"],
                    fontWeight: 700,
                    color: COLORS.success,
                    marginBottom: 20,
                  }}
                >
                  After
                </div>
                {afterItems.map((item, i) => (
                  <div
                    key={item}
                    style={{
                      fontSize: TYPOGRAPHY.fontSize.xl,
                      color: COLORS.textSecondary,
                      marginBottom: 12,
                      opacity: interpolate(
                        frame,
                        [70 + i * 15, 85 + i * 15],
                        [0, 1],
                        CLAMP,
                      ),
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </GlassmorphismCard>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Part 2: Animated metric counters (350-700) */}
      <Sequence from={350} durationInFrames={350}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 50,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: 80,
              alignItems: "center",
            }}
          >
            {/* 164 tool files */}
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: 96,
                  fontWeight: 800,
                  color: COLORS.cyan,
                  fontFamily: TYPOGRAPHY.fontFamily.mono,
                }}
              >
                {countUp(frame, fps, 164, 1.5, 370)}
              </div>
              <div
                style={{
                  fontSize: TYPOGRAPHY.fontSize.xl,
                  color: COLORS.textSecondary,
                  marginTop: 10,
                  opacity: interpolate(frame, [380, 400], [0, 1], CLAMP),
                }}
              >
                Tool Files
              </div>
            </div>

            {/* 79 test files */}
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: 96,
                  fontWeight: 800,
                  color: COLORS.purple,
                  fontFamily: TYPOGRAPHY.fontFamily.mono,
                }}
              >
                {countUp(frame, fps, 79, 1.5, 400)}
              </div>
              <div
                style={{
                  fontSize: TYPOGRAPHY.fontSize.xl,
                  color: COLORS.textSecondary,
                  marginTop: 10,
                  opacity: interpolate(frame, [410, 430], [0, 1], CLAMP),
                }}
              >
                Test Files
              </div>
            </div>

            {/* 1:1 ratio */}
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: 96,
                  fontWeight: 800,
                  color: COLORS.success,
                  fontFamily: TYPOGRAPHY.fontFamily.mono,
                  opacity: spring({
                    frame: frame - 440,
                    fps,
                    config: SPRING_CONFIGS.snappy,
                  }),
                  transform: `scale(${spring({
                    frame: frame - 440,
                    fps,
                    config: SPRING_CONFIGS.bouncy,
                  })})`,
                }}
              >
                1:1
              </div>
              <div
                style={{
                  fontSize: TYPOGRAPHY.fontSize.xl,
                  color: COLORS.textSecondary,
                  marginTop: 10,
                  opacity: interpolate(frame, [460, 480], [0, 1], CLAMP),
                }}
              >
                Ratio
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: TYPOGRAPHY.fontSize["2xl"],
              color: COLORS.textMuted,
              opacity: interpolate(frame, [500, 530], [0, 1], CLAMP),
            }}
          >
            Nearly one test file per tool file
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Part 3: Progressive disclosure (700-1050) */}
      <Sequence from={700} durationInFrames={350}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 50,
          }}
        >
          <KineticText
            text="Five gateway tools"
            fontSize={TYPOGRAPHY.fontSize["5xl"]}
            type="reveal"
            delay={720}
          />

          <KineticText
            text="Everything else discoverable"
            fontSize={TYPOGRAPHY.fontSize["3xl"]}
            color={COLORS.cyan}
            type="scale"
            delay={790}
          />

          <div
            style={{
              fontSize: TYPOGRAPHY.fontSize["2xl"],
              color: COLORS.textMuted,
              opacity: interpolate(frame, [860, 890], [0, 1], CLAMP),
            }}
          >
            Progressive disclosure
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
