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
import { typewriter, progressBar } from "../../lib/animations";
import { BrowserFrame } from "../../components/mockups/BrowserFrame";
import { SplitScreenReveal } from "../../components/animations/SplitScreenReveal";
import { CodeBlock } from "../../components/ui/CodeBlock";
import { ProgressBar } from "../../components/ui/ProgressBar";

const DEMO_CODE = `export default function Tetris() {
  const [board, setBoard] = useState(
    createEmptyBoard()
  );
  const [piece, setPiece] = useState(
    randomPiece()
  );

  useKeyboard(({ key }) => {
    if (key === "ArrowLeft") moveLeft();
    if (key === "ArrowRight") moveRight();
    if (key === "ArrowDown") drop();
    if (key === "Space") rotate();
  });

  return <Board cells={board} />;
}`;

export const Scene05_Demo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const demoUrl = "spike.land/games/tetris";
  const visibleDemoUrl = typewriter(frame, fps, demoUrl, 20, 15);

  // Progress bar for generation phase
  const genProgress = progressBar(frame, fps, 550, 900, 0, 100);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.darkBg,
        fontFamily: TYPOGRAPHY.fontFamily.sans,
      }}
    >
      {/* Part 1: Browser with URL + "Route doesn't exist" (0-500) */}
      <Sequence from={0} durationInFrames={500}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 40,
            padding: 80,
          }}
        >
          <BrowserFrame url={visibleDemoUrl} width={1400} height={700}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                gap: 20,
                background: `linear-gradient(135deg, ${COLORS.darkBg}, #1a0f1a)`,
              }}
            >
              {/* Initial 404 state */}
              <div
                style={{
                  fontSize: 96,
                  fontWeight: 900,
                  color: COLORS.error,
                  fontFamily: TYPOGRAPHY.fontFamily.mono,
                  opacity: interpolate(frame, [60, 80, 200, 230], [0, 1, 1, 0], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                  textShadow: `0 0 40px ${COLORS.error}50`,
                }}
              >
                404
              </div>
              <div
                style={{
                  fontSize: 24,
                  color: COLORS.textMuted,
                  opacity: interpolate(frame, [80, 100, 200, 230], [0, 1, 1, 0], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                }}
              >
                Route doesn&apos;t exist... yet
              </div>

              {/* Generation activating */}
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: COLORS.cyan,
                  fontFamily: TYPOGRAPHY.fontFamily.mono,
                  opacity: interpolate(frame, [250, 280], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                  textShadow: `0 0 30px ${COLORS.cyan}50`,
                }}
              >
                Generation Pipeline Activated
              </div>
            </div>
          </BrowserFrame>
        </AbsoluteFill>
      </Sequence>

      {/* Part 2: Split screen - code generation left, progress right (500-1000) */}
      <Sequence from={500} durationInFrames={500}>
        <SplitScreenReveal
          leftContent={
            <AbsoluteFill
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: `linear-gradient(135deg, ${COLORS.darkBg}, #0f0f1a)`,
                padding: 40,
              }}
            >
              <div
                style={{
                  fontSize: TYPOGRAPHY.fontSize.lg,
                  fontWeight: 600,
                  color: COLORS.textSecondary,
                  marginBottom: 20,
                }}
              >
                Code Generation
              </div>
              <div style={{ width: "90%" }}>
                <CodeBlock
                  code={DEMO_CODE}
                  language="tsx"
                  borderColor={COLORS.cyan}
                  delay={520}
                  typingSpeed={50}
                />
              </div>
            </AbsoluteFill>
          }
          rightContent={
            <AbsoluteFill
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: `linear-gradient(135deg, ${COLORS.darkBg}, #0f1a0f)`,
                padding: 40,
                gap: 30,
              }}
            >
              <div
                style={{
                  fontSize: TYPOGRAPHY.fontSize.lg,
                  fontWeight: 600,
                  color: COLORS.textSecondary,
                  marginBottom: 10,
                }}
              >
                Build Progress
              </div>
              <div style={{ width: "80%" }}>
                <ProgressBar
                  progress={genProgress}
                  label="Generating..."
                  delay={530}
                  color={COLORS.cyan}
                />
              </div>
              <div style={{ width: "80%", marginTop: 20 }}>
                <ProgressBar
                  progress={Math.max(0, genProgress - 30)}
                  label="Reviewing..."
                  delay={600}
                  color={COLORS.purple}
                />
              </div>
              <div style={{ width: "80%", marginTop: 20 }}>
                <ProgressBar
                  progress={Math.max(0, genProgress - 60)}
                  label="Transpiling..."
                  delay={670}
                  color={COLORS.amber}
                />
              </div>
            </AbsoluteFill>
          }
          delay={510}
        />
      </Sequence>

      {/* Part 3: Browser showing completed Tetris app (1000-1500) */}
      <Sequence from={1000} durationInFrames={500}>
        <AbsoluteFill
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 80,
          }}
        >
          <BrowserFrame url="spike.land/games/tetris" width={1400} height={750}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                background: `linear-gradient(135deg, ${COLORS.darkBg}, #0f1a0f)`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 20,
                }}
              >
                <div
                  style={{
                    fontSize: 96,
                    fontWeight: 800,
                    color: COLORS.success,
                    fontFamily: TYPOGRAPHY.fontFamily.mono,
                    textShadow: `0 0 40px ${COLORS.success}60, 0 0 80px ${COLORS.success}30`,
                    transform: `scale(${spring({
                      frame: frame - 1020,
                      fps,
                      config: SPRING_CONFIGS.bouncy,
                    })})`,
                  }}
                >
                  TETRIS
                </div>
                <div
                  style={{
                    fontSize: 20,
                    color: COLORS.success,
                    fontFamily: TYPOGRAPHY.fontFamily.mono,
                    opacity: interpolate(frame, [1060, 1080], [0, 1], {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    }),
                  }}
                >
                  Live and playable in the browser
                </div>
              </div>
            </div>
          </BrowserFrame>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
