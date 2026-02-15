import React from "react";
import { AbsoluteFill, Composition, Folder } from "remotion";
import {
  VibeCodingParadox,
  Scene01_Hook,
  Scene02_PhysicsOfAttention,
  Scene03_BeforeState,
  Scene04_FiveLayerStack,
  Scene05_FixLoop,
  Scene06_AgentMemory,
  Scene07_SkillMatching,
  Scene08_MetaBuild,
  Scene09_Results,
  Scene10_EndCard,
} from "./compositions/vibe-coding-paradox";
import { VCP_DURATIONS, VCP_TIMING, VIDEO_CONFIG, COLORS, TYPOGRAPHY } from "./lib/constants";
import { N404_DURATIONS, N404_TIMING } from "./lib/n404-constants";
import { VeritasiumPitch, VERITASIUM_SCENE_DURATION } from "./compositions/veritasium/VeritasiumPitch";
import {
  NoMore404s,
  Scene01_Hook as N404_Scene01_Hook,
  Scene02_Problem as N404_Scene02_Problem,
  Scene03_Pipeline as N404_Scene03_Pipeline,
  Scene04_Reviewers as N404_Scene04_Reviewers,
  Scene05_Demo as N404_Scene05_Demo,
  Scene06_BridgeMind as N404_Scene06_BridgeMind,
  Scene07_Flywheel as N404_Scene07_Flywheel,
  Scene08_EndCard as N404_Scene08_EndCard,
} from "./compositions/no-more-404s";

// Component imports for preview compositions
import { TokenVisualization } from "./components/animations/TokenVisualization";
import { SoftmaxEquation } from "./components/ui/SoftmaxEquation";
import { FiveLayerStack } from "./components/diagrams/FiveLayerStack";
import { DarwinianTree } from "./components/animations/DarwinianTree";
import { PetriDishAnimation } from "./components/animations/PetriDishAnimation";
import { RecursiveZoom } from "./components/animations/RecursiveZoom";
import { AttentionSpotlight } from "./components/animations/AttentionSpotlight";
import { SkillMatchingDiagram } from "./components/diagrams/SkillMatchingDiagram";
import { TakeawayCards } from "./components/ui/TakeawayCards";

// Wrapper for component previews
const PreviewWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill
    style={{
      backgroundColor: COLORS.darkBg,
      fontFamily: TYPOGRAPHY.fontFamily.sans,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    {children}
  </AbsoluteFill>
);

// Component preview compositions
const TokenVisualizationPreview: React.FC = () => (
  <TokenVisualization text="The quick brown fox jumps over the lazy dog" delay={5} />
);

const SoftmaxEquationPreview: React.FC = () => (
  <PreviewWrapper>
    <SoftmaxEquation variant="softmax" delay={5} />
  </PreviewWrapper>
);

const FiveLayerStackPreview: React.FC = () => (
  <PreviewWrapper>
    <FiveLayerStack revealCount={5} delay={5} />
  </PreviewWrapper>
);

const DarwinianTreePreview: React.FC = () => (
  <DarwinianTree generations={3} delay={5} />
);

const PetriDishPreview: React.FC = () => (
  <PetriDishAnimation
    organisms={[
      { label: "Import fix", status: "active", confidence: 0.85 },
      { label: "ESM pattern", status: "active", confidence: 0.7 },
      { label: "Wrong approach", status: "deprecated", confidence: 0.2 },
      { label: "New pattern", status: "candidate", confidence: 0.5 },
    ]}
    delay={5}
  />
);

const RecursiveZoomPreview: React.FC = () => (
  <RecursiveZoom
    labels={["Layer 1", "Layer 2", "Layer 3", "Layer 4", "Layer 5"]}
    delay={5}
  />
);

const AttentionSpotlightPreview: React.FC = () => (
  <AttentionSpotlight tokenCount={12} delay={5} />
);

const SkillMatchingPreview: React.FC = () => (
  <PreviewWrapper>
    <SkillMatchingDiagram url="spike.land/create/games/tetris" delay={5} />
  </PreviewWrapper>
);

const TakeawayCardsPreview: React.FC = () => (
  <PreviewWrapper>
    <TakeawayCards delay={5} />
  </PreviewWrapper>
);

const PREVIEW_DURATION = 300;

export const RemotionRoot = () => {
  return (
    <>
      {/* Main 11-minute composition */}
      <Composition
        id="VibeCodingParadox"
        component={VibeCodingParadox}
        durationInFrames={VCP_TIMING.totalFrames}
        fps={VCP_TIMING.fps}
        width={VIDEO_CONFIG.width}
        height={VIDEO_CONFIG.height}
      />

      <Composition
        id="VeritasiumPitch"
        component={VeritasiumPitch}
        durationInFrames={VERITASIUM_SCENE_DURATION * 7}
        fps={VCP_TIMING.fps}
        width={VIDEO_CONFIG.width}
        height={VIDEO_CONFIG.height}
      />

      {/* No More 404s — 5-minute composition */}
      <Composition
        id="NoMore404s"
        component={NoMore404s}
        durationInFrames={N404_TIMING.totalFrames}
        fps={N404_TIMING.fps}
        width={VIDEO_CONFIG.width}
        height={VIDEO_CONFIG.height}
      />

      {/* Individual scenes for preview */}
      <Folder name="Scenes">
        <Composition
          id="VCP-Scene01-Hook"
          component={Scene01_Hook}
          durationInFrames={VCP_DURATIONS.hook}
          fps={VCP_TIMING.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
        <Composition
          id="VCP-Scene02-PhysicsOfAttention"
          component={Scene02_PhysicsOfAttention}
          durationInFrames={VCP_DURATIONS.physicsOfAttention}
          fps={VCP_TIMING.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
        <Composition
          id="VCP-Scene03-BeforeState"
          component={Scene03_BeforeState}
          durationInFrames={VCP_DURATIONS.beforeState}
          fps={VCP_TIMING.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
        <Composition
          id="VCP-Scene04-FiveLayerStack"
          component={Scene04_FiveLayerStack}
          durationInFrames={VCP_DURATIONS.fiveLayerStack}
          fps={VCP_TIMING.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
        <Composition
          id="VCP-Scene05-FixLoop"
          component={Scene05_FixLoop}
          durationInFrames={VCP_DURATIONS.fixLoop}
          fps={VCP_TIMING.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
        <Composition
          id="VCP-Scene06-AgentMemory"
          component={Scene06_AgentMemory}
          durationInFrames={VCP_DURATIONS.agentMemory}
          fps={VCP_TIMING.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
        <Composition
          id="VCP-Scene07-SkillMatching"
          component={Scene07_SkillMatching}
          durationInFrames={VCP_DURATIONS.skillMatching}
          fps={VCP_TIMING.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
        <Composition
          id="VCP-Scene08-MetaBuild"
          component={Scene08_MetaBuild}
          durationInFrames={VCP_DURATIONS.metaBuild}
          fps={VCP_TIMING.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
        <Composition
          id="VCP-Scene09-Results"
          component={Scene09_Results}
          durationInFrames={VCP_DURATIONS.results}
          fps={VCP_TIMING.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
        <Composition
          id="VCP-Scene10-EndCard"
          component={Scene10_EndCard}
          durationInFrames={VCP_DURATIONS.endCard}
          fps={VCP_TIMING.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
      </Folder>

      {/* N404 individual scenes for preview */}
      <Folder name="N404-Scenes">
        <Composition
          id="N404-Scene01-Hook"
          component={N404_Scene01_Hook}
          durationInFrames={N404_DURATIONS.hook}
          fps={N404_TIMING.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
        <Composition
          id="N404-Scene02-Problem"
          component={N404_Scene02_Problem}
          durationInFrames={N404_DURATIONS.problem}
          fps={N404_TIMING.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
        <Composition
          id="N404-Scene03-Pipeline"
          component={N404_Scene03_Pipeline}
          durationInFrames={N404_DURATIONS.pipeline}
          fps={N404_TIMING.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
        <Composition
          id="N404-Scene04-Reviewers"
          component={N404_Scene04_Reviewers}
          durationInFrames={N404_DURATIONS.reviewers}
          fps={N404_TIMING.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
        <Composition
          id="N404-Scene05-Demo"
          component={N404_Scene05_Demo}
          durationInFrames={N404_DURATIONS.demo}
          fps={N404_TIMING.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
        <Composition
          id="N404-Scene06-BridgeMind"
          component={N404_Scene06_BridgeMind}
          durationInFrames={N404_DURATIONS.bridgemind}
          fps={N404_TIMING.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
        <Composition
          id="N404-Scene07-Flywheel"
          component={N404_Scene07_Flywheel}
          durationInFrames={N404_DURATIONS.flywheel}
          fps={N404_TIMING.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
        <Composition
          id="N404-Scene08-EndCard"
          component={N404_Scene08_EndCard}
          durationInFrames={N404_DURATIONS.endCard}
          fps={N404_TIMING.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
      </Folder>

      {/* Component test compositions (300 frames each) */}
      <Folder name="Components">
        <Composition
          id="Preview-TokenVisualization"
          component={TokenVisualizationPreview}
          durationInFrames={PREVIEW_DURATION}
          fps={VCP_TIMING.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
        <Composition
          id="Preview-SoftmaxEquation"
          component={SoftmaxEquationPreview}
          durationInFrames={PREVIEW_DURATION}
          fps={VCP_TIMING.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
        <Composition
          id="Preview-FiveLayerStack"
          component={FiveLayerStackPreview}
          durationInFrames={PREVIEW_DURATION}
          fps={VCP_TIMING.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
        <Composition
          id="Preview-DarwinianTree"
          component={DarwinianTreePreview}
          durationInFrames={PREVIEW_DURATION}
          fps={VCP_TIMING.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
        <Composition
          id="Preview-PetriDish"
          component={PetriDishPreview}
          durationInFrames={PREVIEW_DURATION}
          fps={VCP_TIMING.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
        <Composition
          id="Preview-RecursiveZoom"
          component={RecursiveZoomPreview}
          durationInFrames={PREVIEW_DURATION}
          fps={VCP_TIMING.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
        <Composition
          id="Preview-AttentionSpotlight"
          component={AttentionSpotlightPreview}
          durationInFrames={PREVIEW_DURATION}
          fps={VCP_TIMING.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
        <Composition
          id="Preview-SkillMatching"
          component={SkillMatchingPreview}
          durationInFrames={PREVIEW_DURATION}
          fps={VCP_TIMING.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
        <Composition
          id="Preview-TakeawayCards"
          component={TakeawayCardsPreview}
          durationInFrames={PREVIEW_DURATION}
          fps={VCP_TIMING.fps}
          width={VIDEO_CONFIG.width}
          height={VIDEO_CONFIG.height}
        />
      </Folder>
    </>
  );
};
