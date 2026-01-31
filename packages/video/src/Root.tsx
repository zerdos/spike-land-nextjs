import { Composition, Folder } from "remotion";
import { SCENE_DURATIONS, VIDEO_CONFIG } from "./lib/constants";
import {
  AIDiscovery,
  ChatSolution,
  EndCard,
  GoingLive,
  IntroHook,
  LiveDeployment,
  LiveUpdate,
  MyAppsAgent,
  OrbitDashboard,
  PromoVideo,
  ResultsProof,
  TheProblem,
  Transformation,
} from "./Video";

/**
 * Remotion Root - Composition Registry
 *
 * This file registers all compositions that can be rendered.
 * Run `yarn dev` to open Remotion Studio and preview compositions.
 */
export const RemotionRoot = () => {
  return (
    <>
      {/* Main promo video - 60 seconds */}
      <Composition
        id="PromoVideo"
        component={PromoVideo}
        durationInFrames={VIDEO_CONFIG.durationInFrames}
        fps={VIDEO_CONFIG.fps}
        width={VIDEO_CONFIG.width}
        height={VIDEO_CONFIG.height}
      />

      {/* New 8-scene structure */}
      <Folder name="Scenes">
        <Composition
          id="Scene1-IntroHook"
          component={IntroHook}
          durationInFrames={SCENE_DURATIONS.scene1}
          fps={VIDEO_CONFIG.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />

        <Composition
          id="Scene2-TheProblem"
          component={TheProblem}
          durationInFrames={SCENE_DURATIONS.scene2}
          fps={VIDEO_CONFIG.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />

        <Composition
          id="Scene3-AIDiscovery"
          component={AIDiscovery}
          durationInFrames={SCENE_DURATIONS.scene3}
          fps={VIDEO_CONFIG.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />

        <Composition
          id="Scene4-ChatSolution"
          component={ChatSolution}
          durationInFrames={SCENE_DURATIONS.scene4}
          fps={VIDEO_CONFIG.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />

        <Composition
          id="Scene5-Transformation"
          component={Transformation}
          durationInFrames={SCENE_DURATIONS.scene5}
          fps={VIDEO_CONFIG.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />

        <Composition
          id="Scene6-GoingLive"
          component={GoingLive}
          durationInFrames={SCENE_DURATIONS.scene6}
          fps={VIDEO_CONFIG.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />

        <Composition
          id="Scene7-ResultsProof"
          component={ResultsProof}
          durationInFrames={SCENE_DURATIONS.scene7}
          fps={VIDEO_CONFIG.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />

        <Composition
          id="Scene8-EndCard"
          component={EndCard}
          durationInFrames={SCENE_DURATIONS.scene8}
          fps={VIDEO_CONFIG.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
      </Folder>

      {/* Extended durations for development/testing */}
      <Folder name="Extended">
        <Composition
          id="IntroHook-Extended"
          component={IntroHook}
          durationInFrames={300} // 10 seconds
          fps={VIDEO_CONFIG.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />

        <Composition
          id="TheProblem-Extended"
          component={TheProblem}
          durationInFrames={480} // 16 seconds
          fps={VIDEO_CONFIG.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />

        <Composition
          id="AIDiscovery-Extended"
          component={AIDiscovery}
          durationInFrames={360} // 12 seconds
          fps={VIDEO_CONFIG.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />

        <Composition
          id="ChatSolution-Extended"
          component={ChatSolution}
          durationInFrames={600} // 20 seconds
          fps={VIDEO_CONFIG.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />

        <Composition
          id="Transformation-Extended"
          component={Transformation}
          durationInFrames={480} // 16 seconds
          fps={VIDEO_CONFIG.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />

        <Composition
          id="GoingLive-Extended"
          component={GoingLive}
          durationInFrames={480} // 16 seconds
          fps={VIDEO_CONFIG.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />

        <Composition
          id="ResultsProof-Extended"
          component={ResultsProof}
          durationInFrames={360} // 12 seconds
          fps={VIDEO_CONFIG.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />

        <Composition
          id="EndCard-Extended"
          component={EndCard}
          durationInFrames={300} // 10 seconds
          fps={VIDEO_CONFIG.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
      </Folder>

      {/* Legacy scenes (from original 15s video) */}
      <Folder name="Legacy">
        <Composition
          id="Legacy-OrbitDashboard"
          component={OrbitDashboard}
          durationInFrames={90}
          fps={VIDEO_CONFIG.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />

        <Composition
          id="Legacy-MyAppsAgent"
          component={MyAppsAgent}
          durationInFrames={150}
          fps={VIDEO_CONFIG.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />

        <Composition
          id="Legacy-LiveUpdate"
          component={LiveUpdate}
          durationInFrames={120}
          fps={VIDEO_CONFIG.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />

        <Composition
          id="Legacy-LiveDeployment"
          component={LiveDeployment}
          durationInFrames={240}
          fps={VIDEO_CONFIG.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
      </Folder>
    </>
  );
};
