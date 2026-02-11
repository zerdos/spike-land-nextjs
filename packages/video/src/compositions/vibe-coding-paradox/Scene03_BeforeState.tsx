import React from "react";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  useCurrentFrame,
  // useVideoConfig,
} from "remotion";
import { COLORS, TYPOGRAPHY } from "../../lib/constants";
import { SingleShotDiagram } from "../../components/diagrams/SingleShotDiagram";
import { CodeBlock } from "../../components/ui/CodeBlock";
import { ExamMetaphor } from "../../components/ui/ExamMetaphor";
import { ComparisonTable } from "../../components/diagrams/ComparisonTable";

const OLD_CODE = `const result = await geminiModel.generateContent(prompt);
if (!result) {
  const retry = await geminiModel.generateContent(prompt);
  return retry;
}
return result;`;

export const Scene03_BeforeState: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.darkBg,
        fontFamily: TYPOGRAPHY.fontFamily.sans,
      }}
    >
      {/* Part 1: Single shot diagram */}
      <Sequence from={0} durationInFrames={600}>
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
              fontSize: 28,
              fontWeight: 700,
              color: COLORS.textSecondary,
              opacity: interpolate(frame, [0, 20], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            The Single-Shot Problem
          </div>
          <SingleShotDiagram delay={10} attemptCount={10} />
        </AbsoluteFill>
      </Sequence>

      {/* Part 2: Old code with naive retry */}
      <Sequence from={600} durationInFrames={450}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 30,
            padding: 80,
          }}
        >
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: COLORS.error,
              opacity: interpolate(frame - 600, [0, 20], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            Naive Retry — No Memory
          </div>
          <div style={{ width: 800 }}>
            <CodeBlock
              code={OLD_CODE}
              language="typescript"
              delay={615}
              typingSpeed={45}
              borderColor={COLORS.error}
            />
          </div>
          <div
            style={{
              fontSize: 18,
              color: COLORS.textMuted,
              textAlign: "center",
              maxWidth: 600,
              lineHeight: 1.5,
              opacity: interpolate(frame - 600, [150, 180], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            Same prompt, same model, same mistakes. The retry has no idea what
            went wrong the first time.
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Part 3: Exam metaphor with memory wipe */}
      <Sequence from={1050} durationInFrames={300}>
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
              fontSize: 26,
              fontWeight: 700,
              color: COLORS.textPrimary,
              opacity: interpolate(frame - 1050, [0, 20], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            Like retaking an exam with your memory wiped
          </div>
          <ExamMetaphor delay={1065} showMemoryWipe />
        </AbsoluteFill>
      </Sequence>

      {/* Part 4: Comparison table */}
      <Sequence from={1350} durationInFrames={450}>
        <AbsoluteFill
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ComparisonTable delay={1365} />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
