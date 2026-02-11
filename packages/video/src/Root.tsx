import { Composition, Folder } from "remotion";
import { BridgeMindPromo } from "./compositions/bridgemind/BridgeMindPromo";
import {
  VeritasiumPitch,
  Scene01_Hook,
  Scene02_Problem,
  Scene03_Solution,
  Scene04_Magic,
  Scene05_Proof,
  Scene06_Implications,
  Scene07_CTA,
} from "./compositions/veritasium";
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
  PhysicsOfAttention,
  PromoVideo,
  ResultsProof,
  TheProblem,
  Transformation,
} from "./Video";

import {
  BRIDGEMIND_TIMING,
  SCENE_DURATIONS,
  VERITASIUM_DURATIONS,
  VERITASIUM_TIMING,
  VIDEO_CONFIG,
} from "./lib/constants";
import { FORMAT_CONFIGS } from "./lib/schemas";

/**
 * Remotion Root - Composition Registry
 */
export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="BridgeMindPromo"
        component={BridgeMindPromo}
        durationInFrames={BRIDGEMIND_TIMING.totalFrames}
        fps={BRIDGEMIND_TIMING.fps}
        width={FORMAT_CONFIGS.landscape.width}
        height={FORMAT_CONFIGS.landscape.height}
      />

      <Composition
        id="BridgeMindPromo-Vertical"
        component={BridgeMindPromo}
        durationInFrames={BRIDGEMIND_TIMING.totalFrames}
        fps={BRIDGEMIND_TIMING.fps}
        width={FORMAT_CONFIGS.portrait.width}
        height={FORMAT_CONFIGS.portrait.height}
      />

      <Composition
        id="BridgeMindPromo-Square"
        component={BridgeMindPromo}
        durationInFrames={BRIDGEMIND_TIMING.totalFrames}
        fps={BRIDGEMIND_TIMING.fps}
        width={FORMAT_CONFIGS.square.width}
        height={FORMAT_CONFIGS.square.height}
      />

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

      {/* Veritasium Pitch — "The AI That Remembers Every Mistake" (4 min) */}
      <Composition
        id="VeritasiumPitch"
        component={VeritasiumPitch}
        durationInFrames={VERITASIUM_TIMING.totalFrames}
        fps={VERITASIUM_TIMING.fps}
        width={VIDEO_CONFIG.width}
        height={VIDEO_CONFIG.height}
      />

      <Folder name="Veritasium">
        <Composition
          id="V-Scene1-Hook"
          component={Scene01_Hook}
          durationInFrames={VERITASIUM_DURATIONS.hook}
          fps={VERITASIUM_TIMING.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
        <Composition
          id="V-Scene2-Problem"
          component={Scene02_Problem}
          durationInFrames={VERITASIUM_DURATIONS.problem}
          fps={VERITASIUM_TIMING.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
        <Composition
          id="V-Scene3-Solution"
          component={Scene03_Solution}
          durationInFrames={VERITASIUM_DURATIONS.solution}
          fps={VERITASIUM_TIMING.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
        <Composition
          id="V-Scene4-Magic"
          component={Scene04_Magic}
          durationInFrames={VERITASIUM_DURATIONS.magic}
          fps={VERITASIUM_TIMING.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
        <Composition
          id="V-Scene5-Proof"
          component={Scene05_Proof}
          durationInFrames={VERITASIUM_DURATIONS.proof}
          fps={VERITASIUM_TIMING.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
        <Composition
          id="V-Scene6-Implications"
          component={Scene06_Implications}
          durationInFrames={VERITASIUM_DURATIONS.implications}
          fps={VERITASIUM_TIMING.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
        <Composition
          id="V-Scene7-CTA"
          component={Scene07_CTA}
          durationInFrames={VERITASIUM_DURATIONS.cta}
          fps={VERITASIUM_TIMING.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
      </Folder>

      {/* YouTube Long-form Content */}
      <Folder name="YouTube">
        <Composition
          id="PhysicsOfAttention"
          component={PhysicsOfAttention}
          durationInFrames={24578} // ~13.6 minutes @ 30fps
          fps={VIDEO_CONFIG.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
      </Folder>

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
