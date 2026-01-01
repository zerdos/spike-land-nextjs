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

function ConnectToPeerForm({ onConnect }: { onConnect: (peerId: string) => void; }) {
  const [remotePeerId, setRemotePeerId] = useState("");
  const [connecting, setConnecting] = useState(false);

  const handleConnect = () => {
    if (!remotePeerId.trim()) return;
    setConnecting(true);
    onConnect(remotePeerId.trim());
    setTimeout(() => {
      setConnecting(false);
      setRemotePeerId("");
    }, 1000);
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400">Connect to peer:</label>
      <div className="flex gap-1">
        <input
          type="text"
          value={remotePeerId}
          onChange={(e) => setRemotePeerId(e.target.value)}
          placeholder="Enter peer ID"
          className="flex-1 px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-500"
          onKeyDown={(e) => e.key === "Enter" && handleConnect()}
        />
        <button
          onClick={handleConnect}
          disabled={connecting || !remotePeerId.trim()}
          className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 rounded"
        >
          {connecting ? "..." : "Join"}
        </button>
      </div>
    </div>
  );
}

function GameUI() {
  const game = useGame();
  const [handOpen, setHandOpen] = useState(false);
  const [deckInitialized, setDeckInitialized] = useState(false);

  // Subscribe to Yjs state changes, pass isSynced to ensure refresh after persistence loads
  const gameState = useYjsState(game?.doc ?? null, game?.isSynced ?? false);

  // Initialize deck if empty (only once after sync is complete)
  useEffect(() => {
    if (!game?.doc || !game.isSynced || deckInitialized) {
      return;
    }
    // Small delay to ensure state has been refreshed from persistence
    const timer = setTimeout(() => {
      if (gameState.cards.length === 0) {
        const cards = createStandardDeck();
        initializeDeck(game.doc, cards);
      }
      setDeckInitialized(true);
    }, 100);
    return () => clearTimeout(timer);
  }, [game?.doc, game?.isSynced, gameState.cards.length, deckInitialized]);

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

  const handleToggleVideo = useCallback(async () => {
    if (!game?.media) return;

    if (game.media.localStream) {
      // Turn off camera
      game.media.localStream.getTracks().forEach(track => track.stop());
      // Note: The hook doesn't expose a way to clear localStream, but stopping tracks is enough
    } else {
      // Turn on camera and call all connected peers
      const stream = await game.media.enableMedia(true, true);
      if (stream && game.connections.size > 0) {
        // Give a moment for the stream to be ready, then call all peers
        setTimeout(() => {
          game.media.callAll();
        }, 100);
      }
    }
  }, [game?.media, game?.connections]);

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
        onToggleVideo={handleToggleVideo}
        videoEnabled={!!media.localStream}
      />
      <HandDrawer
        hand={handCards}
        isOpen={handOpen}
        onToggle={() => setHandOpen(!handOpen)}
        onPlayCard={handlePlayCard}
      />

      {/* Connection status */}
      <div className="fixed top-4 right-4 bg-black/80 text-white p-3 rounded-lg text-sm z-50 min-w-[220px] max-w-[280px]">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${game.isSynced ? "bg-green-500" : "bg-yellow-500"}`}
          />
          <span className="font-medium">{game.isSynced ? "Ready to Play" : "Loading..."}</span>
        </div>

        {peerId && (
          <div className="mt-2 p-2 bg-gray-900 rounded">
            <div className="text-xs text-gray-400 mb-1">Your ID (share with others):</div>
            <div className="flex items-center gap-2">
              <code className="text-green-400 font-mono text-xs">{peerId}</code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(peerId);
                }}
                className="px-2 py-0.5 text-xs bg-blue-600 hover:bg-blue-500 rounded"
              >
                Copy
              </button>
            </div>
          </div>
        )}

        <div className="mt-2 text-xs text-gray-400">
          Deck: {gameState.cards.filter(c => c.ownerId === null).length} | Hand: {handCards.length}
          {" "}
          | Dice: {gameState.dice.length}
        </div>

        {/* Connected peers */}
        <div className="mt-2 pt-2 border-t border-gray-600">
          {game.connections.size > 0
            ? (
              <div>
                <div className="text-xs text-green-400 font-medium mb-1">
                  {game.connections.size} Player{game.connections.size > 1 ? "s" : ""} Connected
                </div>
                <div className="text-xs text-gray-500">
                  {Array.from(game.connections.keys()).map(id => (
                    <div key={id} className="truncate">• {id.slice(0, 12)}...</div>
                  ))}
                </div>
              </div>
            )
            : (
              <div className="text-xs text-yellow-400">
                No other players connected
              </div>
            )}
        </div>

        {/* Connect to peer input */}
        <div className="mt-2 pt-2 border-t border-gray-600">
          <ConnectToPeerForm onConnect={game.connectToPeer} />
        </div>

        {/* Instructions when alone */}
        {game.connections.size === 0 && (
          <div className="mt-2 pt-2 border-t border-gray-600 text-xs text-gray-500">
            To play with others:
            <ol className="list-decimal ml-3 mt-1 space-y-0.5">
              <li>Share your ID above</li>
              <li>Or enter their ID below</li>
            </ol>
          </div>
        )}
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
