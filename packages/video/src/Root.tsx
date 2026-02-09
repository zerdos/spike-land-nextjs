import { Composition, Folder } from "remotion";
import { PhysicsOfAttention, PromoVideo } from "./Video";
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
  Scene10_MetaOutro,
} from "./compositions/AttentionScenes";
import { VIDEO_CONFIG, SCENE_CHAPTERS } from "./lib/constants";

/**
 * Remotion Root - Composition Registry
 */
export const RemotionRoot = () => {
  const chapters = [
    { component: Scene01_TheHook, ...SCENE_CHAPTERS[0] },
    { component: Scene02_ContextDefined, ...SCENE_CHAPTERS[1] },
    { component: Scene03_PlanMode, ...SCENE_CHAPTERS[2] },
    { component: Scene04_MementoMemory, ...SCENE_CHAPTERS[3] },
    { component: Scene05_AttentionPhysics, ...SCENE_CHAPTERS[4] },
    { component: Scene06_TokenEconomics, ...SCENE_CHAPTERS[5] },
    { component: Scene07_CachingRot, ...SCENE_CHAPTERS[6] },
    { component: Scene08_Metacognition, ...SCENE_CHAPTERS[7] },
    { component: Scene09_Tactics, ...SCENE_CHAPTERS[8] },
    { component: Scene10_MetaOutro, ...SCENE_CHAPTERS[9] },
  ];

  return (
    <>
      <Composition
        id="Physics-of-Attention"
        component={PhysicsOfAttention}
        durationInFrames={VIDEO_CONFIG.durationInFrames}
        fps={VIDEO_CONFIG.fps}
        width={VIDEO_CONFIG.width}
        height={VIDEO_CONFIG.height}
      />
      
      <Composition
        id="PromoVideo"
        component={PromoVideo}
        durationInFrames={1800}
        fps={VIDEO_CONFIG.fps}
        width={VIDEO_CONFIG.width}
        height={VIDEO_CONFIG.height}
      />

      <Folder name="Attention-Scenes">
        {chapters.map((chapter, i) => (
          <Composition
            key={chapter.label}
            id={`Attn-${String(i + 1).padStart(2, '0')}-${chapter.label.replace(/[^a-zA-Z0-9-]+/g, '-').replace(/-+/g, '-').replace(/(^-|-$)/g, '')}`}
            component={chapter.component}
            durationInFrames={chapter.duration}
            fps={VIDEO_CONFIG.fps}
            width={VIDEO_CONFIG.width}
            height={VIDEO_CONFIG.height}
          />
        ))}
      </Folder>
    </>
  );
};
