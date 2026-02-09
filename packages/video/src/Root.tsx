import { Composition } from "remotion";
import { PhysicsOfAttention, PromoVideo } from "./Video";
import {
  IntroScene,
  UncertaintyScene,
  ProductivityScene,
  AISlopScene,
  QualitySkillsScene,
  IdentityVisionScene,
  OutroScene,
} from "./compositions/AttentionScenes";
import { VIDEO_CONFIG } from "./lib/constants";

/**
 * Remotion Root - Composition Registry
 */
export const RemotionRoot = () => {
  return (
    <>
      {/* Main Orchestrated Videos */}
      <Composition
        id="PromoVideo"
        component={PromoVideo}
        durationInFrames={VIDEO_CONFIG.durationInFrames}
        fps={VIDEO_CONFIG.fps}
        width={VIDEO_CONFIG.width}
        height={VIDEO_CONFIG.height}
      />
      <Composition
        id="PhysicsOfAttention"
        component={PhysicsOfAttention}
        durationInFrames={24578}
        fps={VIDEO_CONFIG.fps}
        width={VIDEO_CONFIG.width}
        height={VIDEO_CONFIG.height}
      />

      {/* Per-Scene Development Previews */}
      <Composition
        id="Attn_01_Intro"
        component={IntroScene}
        durationInFrames={900}
        fps={VIDEO_CONFIG.fps}
        width={VIDEO_CONFIG.width}
        height={VIDEO_CONFIG.height}
      />
      <Composition
        id="Attn_02_Uncertainty"
        component={UncertaintyScene}
        durationInFrames={2700}
        fps={VIDEO_CONFIG.fps}
        width={VIDEO_CONFIG.width}
        height={VIDEO_CONFIG.height}
      />
      <Composition
        id="Attn_03_Productivity"
        component={ProductivityScene}
        durationInFrames={3600}
        fps={VIDEO_CONFIG.fps}
        width={VIDEO_CONFIG.width}
        height={VIDEO_CONFIG.height}
      />
      <Composition
        id="Attn_04_AISlop"
        component={AISlopScene}
        durationInFrames={5400}
        fps={VIDEO_CONFIG.fps}
        width={VIDEO_CONFIG.width}
        height={VIDEO_CONFIG.height}
      />
      <Composition
        id="Attn_05_Quality"
        component={QualitySkillsScene}
        durationInFrames={5400}
        fps={VIDEO_CONFIG.fps}
        width={VIDEO_CONFIG.width}
        height={VIDEO_CONFIG.height}
      />
      <Composition
        id="Attn_06_Identity"
        component={IdentityVisionScene}
        durationInFrames={5400}
        fps={VIDEO_CONFIG.fps}
        width={VIDEO_CONFIG.width}
        height={VIDEO_CONFIG.height}
      />
      <Composition
        id="Attn_07_Outro"
        component={OutroScene}
        durationInFrames={1178}
        fps={VIDEO_CONFIG.fps}
        width={VIDEO_CONFIG.width}
        height={VIDEO_CONFIG.height}
      />
    </>
  );
};
