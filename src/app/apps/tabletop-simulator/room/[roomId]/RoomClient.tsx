"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import {
  GameProvider,
  useGame,
} from "../../../../../../apps/tabletop-simulator/components/providers/GameProvider";
import { ControlsPanel } from "../../../../../../apps/tabletop-simulator/components/ui/ControlsPanel";
import { HandDrawer } from "../../../../../../apps/tabletop-simulator/components/ui/HandDrawer";
import { VideoOverlay } from "../../../../../../apps/tabletop-simulator/components/ui/VideoOverlay";

const GameScene = dynamic(
  () => import("../../../../../../apps/tabletop-simulator/components/GameScene"),
  { ssr: false, loading: () => <div className="text-white">Loading 3D Engine...</div> },
);

function GameUI() {
  const { controls, media, doc } = useGame(); // access exposed state
  const [handOpen, setHandOpen] = useState(false);

  // Wire up actions to updating doc
  const handleDiceRoll = (type: string) => {
    // rollDice(doc, ...);
    console.log("Rolling", type);
  };

  return (
    <>
      <VideoOverlay localStream={media.localStream} remoteStreams={media.remoteStreams} />
      <ControlsPanel
        mode={controls.mode}
        onToggleMode={controls.toggleMode}
        onDiceRoll={handleDiceRoll}
        onToggleHand={() => setHandOpen(!handOpen)}
      />
      <HandDrawer hand={[]} isOpen={handOpen} onToggle={() => setHandOpen(!handOpen)} />
    </>
  );
}

export default function RoomClient({ roomId }: { roomId: string; }) {
  return (
    <GameProvider roomId={roomId}>
      <div className="w-full h-screen bg-black overflow-hidden relative">
        <GameScene />
        <GameUI />
      </div>
    </GameProvider>
  );
}
