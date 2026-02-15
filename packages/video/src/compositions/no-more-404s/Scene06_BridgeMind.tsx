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
      {/* Part 1: Before/After comparison (0-277) */}
      <Sequence from={0} durationInFrames={277}>
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
            delay={8}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: 30,
              marginTop: 40,
            }}
          >
            <GlassmorphismCard width={450} color={COLORS.error} delay={24}>
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
                        [40 + i * 12, 51 + i * 12],
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

            <GlassmorphismCard width={450} color={COLORS.success} delay={40}>
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
                        [55 + i * 12, 67 + i * 12],
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

      {/* Part 2: Animated metric counters (277-554) */}
      <Sequence from={277} durationInFrames={277}>
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
                {countUp(frame, fps, 164, 1.5, 293)}
              </div>
              <div
                style={{
                  fontSize: TYPOGRAPHY.fontSize.xl,
                  color: COLORS.textSecondary,
                  marginTop: 10,
                  opacity: interpolate(frame, [301, 317], [0, 1], CLAMP),
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
                {countUp(frame, fps, 79, 1.5, 317)}
              </div>
              <div
                style={{
                  fontSize: TYPOGRAPHY.fontSize.xl,
                  color: COLORS.textSecondary,
                  marginTop: 10,
                  opacity: interpolate(frame, [325, 340], [0, 1], CLAMP),
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
                    frame: frame - 348,
                    fps,
                    config: SPRING_CONFIGS.snappy,
                  }),
                  transform: `scale(${spring({
                    frame: frame - 348,
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
                  opacity: interpolate(frame, [364, 380], [0, 1], CLAMP),
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
              opacity: interpolate(frame, [396, 420], [0, 1], CLAMP),
            }}
          >
            Nearly one test file per tool file
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Part 3: Progressive disclosure (554-831) */}
      <Sequence from={554} durationInFrames={277}>
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
            delay={570}
          />

          <KineticText
            text="Everything else discoverable"
            fontSize={TYPOGRAPHY.fontSize["3xl"]}
            color={COLORS.cyan}
            type="scale"
            delay={625}
          />

          <div
            style={{
              fontSize: TYPOGRAPHY.fontSize["2xl"],
              color: COLORS.textMuted,
              opacity: interpolate(frame, [681, 705], [0, 1], CLAMP),
            }}
          >
            Progressive disclosure
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
