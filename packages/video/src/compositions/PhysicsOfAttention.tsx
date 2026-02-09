import { AbsoluteFill, Audio, staticFile, Sequence } from "remotion";
import { COLORS, SCENE_CHAPTERS } from "../lib/constants";
import { 
  Scene01_TheHook,
  Scene02_ContextDefined,
  Scene03_PlanMode,
  Scene04_MementoMemory,
  Scene05_AttentionPhysics,
  Scene06_TokenEconomics,
  Scene07_CachingRot,
  Scene08_Metacognition,
  Scene09_Tactics,
  Scene10_MetaOutro
} from "./AttentionScenes";
import { SubtitleOverlay } from "../components/ui/SubtitleOverlay";

/**
 * YouTube Long-form Composition: Context Engineering and the Physics of Attention
 * 
 * Total Frames: 24578 (~13.6 minutes @ 30fps)
 * Orchestrates 10 modular scenes and a persistent subtitle layer.
 */
export function PhysicsOfAttention() {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.darkBg, color: COLORS.textPrimary }}>
      <Audio src={staticFile("audio/physics-of-attention.m4a")} />

      {/* Persistent UI */}
      <SubtitleOverlay />

      {/* Chapter 1: The Hook */}
      <Sequence from={SCENE_CHAPTERS[0].frame} durationInFrames={SCENE_CHAPTERS[0].duration}>
        <Scene01_TheHook />
      </Sequence>

      {/* Chapter 2: Context Engineering Defined */}
      <Sequence from={SCENE_CHAPTERS[1].frame} durationInFrames={SCENE_CHAPTERS[1].duration}>
        <Scene02_ContextDefined />
      </Sequence>

      {/* Chapter 3: Plan Mode Deep Dive */}
      <Sequence from={SCENE_CHAPTERS[2].frame} durationInFrames={SCENE_CHAPTERS[2].duration}>
        <Scene03_PlanMode />
      </Sequence>

      {/* Chapter 4: Zero Memory / Memento */}
      <Sequence from={SCENE_CHAPTERS[3].frame} durationInFrames={SCENE_CHAPTERS[3].duration}>
        <Scene04_MementoMemory />
      </Sequence>

      {/* Chapter 5: Physics of Attention */}
      <Sequence from={SCENE_CHAPTERS[4].frame} durationInFrames={SCENE_CHAPTERS[4].duration}>
        <Scene05_AttentionPhysics />
      </Sequence>

      {/* Chapter 6: Economics of Tokens */}
      <Sequence from={SCENE_CHAPTERS[5].frame} durationInFrames={SCENE_CHAPTERS[5].duration}>
        <Scene06_TokenEconomics />
      </Sequence>

      {/* Chapter 7: Caching & Context Rot */}
      <Sequence from={SCENE_CHAPTERS[6].frame} durationInFrames={SCENE_CHAPTERS[6].duration}>
        <Scene07_CachingRot />
      </Sequence>

      {/* Chapter 8: Metacognition & Human Role */}
      <Sequence from={SCENE_CHAPTERS[7].frame} durationInFrames={SCENE_CHAPTERS[7].duration}>
        <Scene08_Metacognition />
      </Sequence>

      {/* Chapter 9: Practical Tactics */}
      <Sequence from={SCENE_CHAPTERS[8].frame} durationInFrames={SCENE_CHAPTERS[8].duration}>
        <Scene09_Tactics />
      </Sequence>

      {/* Chapter 10: Meta Revelation & Outro */}
      <Sequence from={SCENE_CHAPTERS[9].frame} durationInFrames={SCENE_CHAPTERS[9].duration}>
        <Scene10_MetaOutro />
      </Sequence>
    </AbsoluteFill>
  );
}
