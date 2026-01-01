"use client";
import { nanoid } from "nanoid";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import {
  GameProvider,
  useGame,
} from "../../../../../../apps/tabletop-simulator/components/providers/GameProvider";
import { ControlsPanel } from "../../../../../../apps/tabletop-simulator/components/ui/ControlsPanel";
import { HandDrawer } from "../../../../../../apps/tabletop-simulator/components/ui/HandDrawer";
import { VideoOverlay } from "../../../../../../apps/tabletop-simulator/components/ui/VideoOverlay";
import { useYjsState } from "../../../../../../apps/tabletop-simulator/hooks/useYjsState";
import {
  addDice,
  drawCard,
  flipCard,
  initializeDeck,
  moveCard,
  playCard,
  settleDice,
  updateDeck,
} from "../../../../../../apps/tabletop-simulator/lib/crdt/game-document";
import {
  createStandardDeck,
  shuffleDeck,
} from "../../../../../../apps/tabletop-simulator/lib/game-logic/deck";
import type { DiceType } from "../../../../../../apps/tabletop-simulator/types/dice";

const GameScene = dynamic(
  () => import("../../../../../../apps/tabletop-simulator/components/GameScene"),
  { ssr: false, loading: () => <div className="text-white p-4">Loading 3D Engine...</div> },
);

function GameUI() {
  const game = useGame();
  const [handOpen, setHandOpen] = useState(false);

  // Subscribe to Yjs state changes
  const gameState = useYjsState(game?.doc ?? null);

  // Initialize deck if empty
  useEffect(() => {
    if (game?.doc && game.isSynced && gameState.cards.length === 0) {
      const cards = createStandardDeck();
      initializeDeck(game.doc, cards);
    }
  }, [game?.doc, game?.isSynced, gameState.cards.length]);

  const handleDiceRoll = useCallback((type: string) => {
    if (!game?.doc) return;

    const seed = Date.now();
    const diceState = {
      id: nanoid(),
      type: type as DiceType,
      value: 0,
      position: { x: Math.random() * 2 - 1, y: 2, z: Math.random() * 2 - 1 },
      rotation: { x: 0, y: 0, z: 0 },
      isRolling: true,
      seed,
      ownerId: game.peerId,
    };

    addDice(game.doc, diceState);
  }, [game?.doc, game?.peerId]);

  const handleCardMove = useCallback(
    (id: string, position: { x: number; y: number; z: number; }) => {
      if (!game?.doc) return;
      moveCard(game.doc, id, position);
    },
    [game?.doc],
  );

  const handleCardFlip = useCallback((id: string) => {
    if (!game?.doc) return;
    flipCard(game.doc, id);
  }, [game?.doc]);

  const handleDiceSettle = useCallback((id: string, value: number) => {
    if (!game?.doc) return;
    settleDice(game.doc, id, value);
  }, [game?.doc]);

  const handleDeckDraw = useCallback(() => {
    if (!game?.doc || !game.peerId) return;
    drawCard(game.doc, game.peerId);
  }, [game?.doc, game?.peerId]);

  const handleDeckShuffle = useCallback(() => {
    if (!game?.doc) return;
    const currentCards = gameState.cards.filter(c => c.ownerId === null);
    if (currentCards.length > 0) {
      const shuffled = shuffleDeck(currentCards, Date.now());
      updateDeck(game.doc, [
        ...shuffled,
        ...gameState.cards.filter(c => c.ownerId !== null),
      ]);
    }
  }, [game?.doc, gameState.cards]);

  const handlePlayCard = useCallback((cardId: string) => {
    if (!game?.doc) return;
    // Play card to center of table
    playCard(game.doc, cardId, { x: Math.random() * 4 - 2, y: 0.1, z: Math.random() * 4 - 2 });
  }, [game?.doc]);

  if (!game) return null;

  const { controls, media, peerId } = game;

  // Get cards in player's hand
  const handCards = gameState.cards.filter(card => card.ownerId === peerId);

  return (
    <>
      <GameScene
        cards={gameState.cards}
        dice={gameState.dice}
        playerId={peerId}
        interactionMode={controls.mode}
        onCardMove={handleCardMove}
        onCardFlip={handleCardFlip}
        onDiceSettle={handleDiceSettle}
        onDeckDraw={handleDeckDraw}
        onDeckShuffle={handleDeckShuffle}
      />
      <VideoOverlay localStream={media.localStream} remoteStreams={media.remoteStreams} />
      <ControlsPanel
        mode={controls.mode}
        onToggleMode={controls.toggleMode}
        onDiceRoll={handleDiceRoll}
        onToggleHand={() => setHandOpen(!handOpen)}
      />
      <HandDrawer
        hand={handCards}
        isOpen={handOpen}
        onToggle={() => setHandOpen(!handOpen)}
        onPlayCard={handlePlayCard}
      />

      {/* Connection status */}
      <div className="fixed top-4 right-4 bg-black/70 text-white p-3 rounded-lg text-sm z-50">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${game.isSynced ? "bg-green-500" : "bg-yellow-500"}`}
          />
          <span>{game.isSynced ? "Synced" : "Syncing..."}</span>
        </div>
        {peerId && (
          <div className="mt-2 text-xs text-gray-400">
            Peer ID: {peerId.slice(0, 8)}...
            <button
              onClick={() => navigator.clipboard.writeText(peerId)}
              className="ml-2 text-blue-400 hover:text-blue-300"
            >
              Copy
            </button>
          </div>
        )}
        <div className="mt-1 text-xs text-gray-400">
          Deck: {gameState.cards.filter(c => c.ownerId === null).length} | Hand: {handCards.length}
          {" "}
          | Dice: {gameState.dice.length}
        </div>
      </div>
    </>
  );
}

export default function RoomClient({ roomId }: { roomId: string; }) {
  return (
    <GameProvider roomId={roomId}>
      <div className="w-full h-screen bg-black overflow-hidden relative">
        <GameUI />
      </div>
    </GameProvider>
  );
}
