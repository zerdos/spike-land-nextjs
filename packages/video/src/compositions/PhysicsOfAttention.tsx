import { AbsoluteFill, Audio, staticFile, Sequence } from "remotion";
import { COLORS } from "../lib/constants";
import { 
  IntroScene, 
  UncertaintyScene, 
  ProductivityScene, 
  AISlopScene, 
  QualitySkillsScene, 
  IdentityVisionScene, 
  OutroScene 
} from "./AttentionScenes";

/**
 * YouTube Long-form Composition: Context Engineering and the Physics of Attention
 * 
 * Total Frames: 24578 (~13.6 minutes @ 30fps)
 */
export function PhysicsOfAttention() {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.darkBg, color: COLORS.textPrimary }}>
      <Audio src={staticFile("audio/physics-of-attention.m4a")} />

      {/* Chapter 1: Intro (0s - 30s) */}
      <Sequence from={0} durationInFrames={900}>
        <IntroScene />
      </Sequence>

      {/* Chapter 2: Uncertainty & Refactor (30s - 2m) */}
      <Sequence from={900} durationInFrames={2700}>
        <UncertaintyScene />
      </Sequence>

      {/* Chapter 3: Productivity Paradox (2m - 4m) */}
      <Sequence from={3600} durationInFrames={3600}>
        <ProductivityScene />
      </Sequence>

      {/* Chapter 4: AI Slop Case Study (4m - 7m) */}
      <Sequence from={7200} durationInFrames={5400}>
        <AISlopScene />
      </Sequence>

      {/* Chapter 5: Quality Triangle & New Skills (7m - 10m) */}
      <Sequence from={12600} durationInFrames={5400}>
        <QualitySkillsScene />
      </Sequence>

      {/* Chapter 6: Identity Crisis & Vision (10m - 13m) */}
      <Sequence from={18000} durationInFrames={5400}>
        <IdentityVisionScene />
      </Sequence>

      {/* Chapter 7: Outro (13m - end) */}
      <Sequence from={23400}>
        <OutroScene />
      </Sequence>
    </AbsoluteFill>
  );
}
