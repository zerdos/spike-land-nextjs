import { Composition, Folder } from "remotion";
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
 * 
 * Organized with Folders for better navigation in Remotion Studio.
 * Using hyphenated IDs for maximum compatibility.
 */
export const RemotionRoot = () => {
  return (
    <>
      {/* Main Production Compositions */}
      <Composition
        id="Physics-of-Attention"
        component={PhysicsOfAttention}
        durationInFrames={24578}
        fps={VIDEO_CONFIG.fps}
        width={VIDEO_CONFIG.width}
        height={VIDEO_CONFIG.height}
      />
      <Composition
        id="PromoVideo"
        component={PromoVideo}
        durationInFrames={VIDEO_CONFIG.durationInFrames}
        fps={VIDEO_CONFIG.fps}
        width={VIDEO_CONFIG.width}
        height={VIDEO_CONFIG.height}
      />

      {/* Individual Scene Previews */}
      <Folder name="Attention-Scenes">
        <Composition
          id="Attn-01-Intro"
          component={IntroScene}
          durationInFrames={900}
          fps={VIDEO_CONFIG.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
        <Composition
          id="Attn-02-Uncertainty"
          component={UncertaintyScene}
          durationInFrames={2700}
          fps={VIDEO_CONFIG.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
        <Composition
          id="Attn-03-Productivity"
          component={ProductivityScene}
          durationInFrames={3600}
          fps={VIDEO_CONFIG.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
        <Composition
          id="Attn-04-AISlop"
          component={AISlopScene}
          durationInFrames={5400}
          fps={VIDEO_CONFIG.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
        <Composition
          id="Attn-05-Quality"
          component={QualitySkillsScene}
          durationInFrames={5400}
          fps={VIDEO_CONFIG.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
        <Composition
          id="Attn-06-Identity"
          component={IdentityVisionScene}
          durationInFrames={5400}
          fps={VIDEO_CONFIG.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
        <Composition
          id="Attn-07-Outro"
          component={OutroScene}
          durationInFrames={1178}
          fps={VIDEO_CONFIG.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
      </Folder>
    </>
  );
};
