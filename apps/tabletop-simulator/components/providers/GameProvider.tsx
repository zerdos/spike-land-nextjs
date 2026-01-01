"use client";
import { createContext, ReactNode, useContext } from "react";
import { useGameMedia } from "../../hooks/useGameMedia";
import { useGameRoom } from "../../hooks/useGameRoom";
import { useTouchControls } from "../../hooks/useTouchControls";

interface GameContextValue {
  doc: ReturnType<typeof useGameRoom>["doc"];
  peer: ReturnType<typeof useGameRoom>["peer"];
  peerId: string | null;
  connections: ReturnType<typeof useGameRoom>["connections"];
  connectToPeer: ReturnType<typeof useGameRoom>["connectToPeer"];
  isSynced: boolean;
  controls: ReturnType<typeof useTouchControls>;
  media: ReturnType<typeof useGameMedia>;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ roomId, children }: { roomId: string; children: ReactNode; }) {
  const room = useGameRoom(roomId);
  const controls = useTouchControls();
  const media = useGameMedia(room.peer, room.connections);

  return (
    <GameContext.Provider value={{ ...room, controls, media }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  return useContext(GameContext);
}
