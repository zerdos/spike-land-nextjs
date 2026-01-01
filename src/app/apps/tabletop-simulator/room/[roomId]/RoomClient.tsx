"use client";
import { nanoid } from "nanoid";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
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

// Game status panel showing players and game info
interface GameStatusProps {
  playerCount: number;
  isSynced: boolean;
  deckCount: number;
  myHandCount: number;
  otherPlayersHands: Map<string, number>;
  peerId: string | null;
}

function GameStatusPanel(
  { playerCount, isSynced, deckCount, myHandCount, otherPlayersHands, peerId }: GameStatusProps,
) {
  const [showDetails, setShowDetails] = useState(false);

  const copyInviteLink = () => {
    const url = new URL(window.location.href);
    if (peerId) {
      url.searchParams.set("host", peerId);
    }
    navigator.clipboard.writeText(url.toString());
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      {/* Compact badge */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="bg-black/80 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-3 hover:bg-black/90 transition-colors"
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isSynced ? "bg-green-500" : "bg-yellow-500 animate-pulse"
          }`}
        />
        <span className="font-medium">
          {playerCount} Player{playerCount > 1 ? "s" : ""}
        </span>
        <span className="text-gray-400">|</span>
        <span className="text-gray-300">🃏 {deckCount}</span>
        <span className="text-gray-400">|</span>
        <span className="text-blue-300">✋ {myHandCount}</span>
      </button>

      {/* Expanded details */}
      {showDetails && (
        <div className="mt-2 bg-black/90 text-white p-3 rounded-lg text-sm min-w-[200px]">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400">Game Status</span>
            <button
              onClick={copyInviteLink}
              className="text-xs bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded"
            >
              Copy Invite Link
            </button>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-400">Deck:</span>
              <span>{deckCount} cards</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Your hand:</span>
              <span className="text-blue-300">{myHandCount} cards</span>
            </div>

            {otherPlayersHands.size > 0 && (
              <div className="pt-2 border-t border-gray-700 mt-2">
                <div className="text-gray-400 mb-1">Other players:</div>
                {Array.from(otherPlayersHands.entries()).map(([id, count]) => (
                  <div key={id} className="flex justify-between text-xs">
                    <span className="text-gray-500 truncate max-w-[100px]">
                      {id.slice(0, 8)}...
                    </span>
                    <span className="text-green-300">{count} cards</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function GameUI() {
  const game = useGame();
  const [handOpen, setHandOpen] = useState(false);
  const [deckInitialized, setDeckInitialized] = useState(false);
  const autoConnectAttempted = useRef(false);

  // Subscribe to Yjs state changes, pass isSynced to ensure refresh after persistence loads
  const gameState = useYjsState(game?.doc ?? null, game?.isSynced ?? false);

  // Auto-connect to host peer from URL parameter
  useEffect(() => {
    if (!game?.peerId || !game.connectToPeer || autoConnectAttempted.current) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const hostPeerId = params.get("host");

    if (hostPeerId && hostPeerId !== game.peerId) {
      autoConnectAttempted.current = true;
      console.log(`[P2P] Auto-connecting to host: ${hostPeerId}`);
      game.connectToPeer(hostPeerId);
    }
  }, [game?.peerId, game?.connectToPeer]);

  // Update URL with own peer ID so the link can be shared
  useEffect(() => {
    if (!game?.peerId) return;

    const url = new URL(window.location.href);
    // Only update if there's no host param or we are the first peer
    if (!url.searchParams.has("host")) {
      url.searchParams.set("host", game.peerId);
      window.history.replaceState({}, "", url.toString());
    }
  }, [game?.peerId]);

  // Initialize deck if empty (only once after sync is complete)
  useEffect(() => {
    if (!game?.doc || !game.isSynced || deckInitialized) {
      return;
    }
    // Small delay to ensure state has been refreshed from persistence
    const timer = setTimeout(() => {
      if (gameState.cards.length === 0) {
        const cards = createStandardDeck();
        // Shuffle the deck on initialization so cards aren't in suit order
        const shuffledCards = shuffleDeck(cards, Date.now());
        initializeDeck(game.doc, shuffledCards);
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

  // Get cards in deck (not owned by anyone)
  const deckCards = gameState.cards.filter(card => card.ownerId === null);

  // Calculate other players' hand counts
  const otherPlayersHands = new Map<string, number>();
  gameState.cards.forEach(card => {
    if (card.ownerId && card.ownerId !== peerId) {
      const current = otherPlayersHands.get(card.ownerId) ?? 0;
      otherPlayersHands.set(card.ownerId, current + 1);
    }
  });

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

      {/* Game status panel */}
      <GameStatusPanel
        playerCount={game.connections.size + 1}
        isSynced={game.isSynced}
        deckCount={deckCards.length}
        myHandCount={handCards.length}
        otherPlayersHands={otherPlayersHands}
        peerId={peerId}
      />
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
