import { Composition, Folder } from "remotion";
import { SCENE_DURATIONS, VIDEO_CONFIG } from "./lib/constants";
import { EndCard, LiveUpdate, MyAppsAgent, OrbitDashboard, PromoVideo } from "./Video";

/**
 * Remotion Root - Composition Registry
 *
 * This file registers all compositions that can be rendered.
 * Run `yarn dev` to open Remotion Studio and preview compositions.
 */
export const RemotionRoot = () => {
  return (
    <>
      {/* Main promo video - 15 seconds */}
      <Composition
        id="PromoVideo"
        component={PromoVideo}
        durationInFrames={VIDEO_CONFIG.durationInFrames}
        fps={VIDEO_CONFIG.fps}
        width={VIDEO_CONFIG.width}
        height={VIDEO_CONFIG.height}
      />

      {/* Individual scenes for preview/development */}
      <Folder name="Scenes">
        <Composition
          id="Scene1-OrbitDashboard"
          component={OrbitDashboard}
          durationInFrames={SCENE_DURATIONS.scene1}
          fps={VIDEO_CONFIG.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />

        <Composition
          id="Scene2-MyAppsAgent"
          component={MyAppsAgent}
          durationInFrames={SCENE_DURATIONS.scene2}
          fps={VIDEO_CONFIG.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />

        <Composition
          id="Scene3-LiveUpdate"
          component={LiveUpdate}
          durationInFrames={SCENE_DURATIONS.scene3}
          fps={VIDEO_CONFIG.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />

        <Composition
          id="Scene4-EndCard"
          component={EndCard}
          durationInFrames={SCENE_DURATIONS.scene4}
          fps={VIDEO_CONFIG.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
      </Folder>

      {/* Extended durations for development */}
      <Folder name="Extended">
        <Composition
          id="Scene1-Extended"
          component={OrbitDashboard}
          durationInFrames={180} // 6 seconds
          fps={VIDEO_CONFIG.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />

        <Composition
          id="Scene2-Extended"
          component={MyAppsAgent}
          durationInFrames={300} // 10 seconds
          fps={VIDEO_CONFIG.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />

        <Composition
          id="Scene3-Extended"
          component={LiveUpdate}
          durationInFrames={240} // 8 seconds
          fps={VIDEO_CONFIG.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />

        <Composition
          id="Scene4-Extended"
          component={EndCard}
          durationInFrames={180} // 6 seconds
          fps={VIDEO_CONFIG.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
      </Folder>
    </>
  );
};
