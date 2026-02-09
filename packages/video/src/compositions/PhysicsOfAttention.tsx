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
      <Sequence from={SCENE_CHAPTERS.hook.from} durationInFrames={SCENE_CHAPTERS.hook.duration}>
        <Scene01_TheHook />
      </Sequence>

      {/* Chapter 2: Context Engineering Defined */}
      <Sequence from={SCENE_CHAPTERS.defined.from} durationInFrames={SCENE_CHAPTERS.defined.duration}>
        <Scene02_ContextDefined />
      </Sequence>

      {/* Chapter 3: Plan Mode Deep Dive */}
      <Sequence from={SCENE_CHAPTERS.planMode.from} durationInFrames={SCENE_CHAPTERS.planMode.duration}>
        <Scene03_PlanMode />
      </Sequence>

      {/* Chapter 4: Zero Memory / Memento */}
      <Sequence from={SCENE_CHAPTERS.memento.from} durationInFrames={SCENE_CHAPTERS.memento.duration}>
        <Scene04_MementoMemory />
      </Sequence>

      {/* Chapter 5: Physics of Attention */}
      <Sequence from={SCENE_CHAPTERS.physics.from} durationInFrames={SCENE_CHAPTERS.physics.duration}>
        <Scene05_AttentionPhysics />
      </Sequence>

      {/* Chapter 6: Economics of Tokens */}
      <Sequence from={SCENE_CHAPTERS.economics.from} durationInFrames={SCENE_CHAPTERS.economics.duration}>
        <Scene06_TokenEconomics />
      </Sequence>

      {/* Chapter 7: Caching & Context Rot */}
      <Sequence from={SCENE_CHAPTERS.caching.from} durationInFrames={SCENE_CHAPTERS.caching.duration}>
        <Scene07_CachingRot />
      </Sequence>

      {/* Chapter 8: Metacognition & Human Role */}
      <Sequence from={SCENE_CHAPTERS.metacog.from} durationInFrames={SCENE_CHAPTERS.metacog.duration}>
        <Scene08_Metacognition />
      </Sequence>

      {/* Chapter 9: Practical Tactics */}
      <Sequence from={SCENE_CHAPTERS.tactics.from} durationInFrames={SCENE_CHAPTERS.tactics.duration}>
        <Scene09_Tactics />
      </Sequence>

      {/* Chapter 10: Meta Revelation & Outro */}
      <Sequence from={SCENE_CHAPTERS.metaOutro.from} durationInFrames={SCENE_CHAPTERS.metaOutro.duration}>
        <Scene10_MetaOutro />
      </Sequence>
    </AbsoluteFill>
  );
}
