"use client";
import { createContext, ReactNode, useContext } from "react";
import { useGameMedia } from "../../hooks/useGameMedia";
import { useGameRoom } from "../../hooks/useGameRoom";
import { useTouchControls } from "../../hooks/useTouchControls";

const GameContext = createContext<any>(null);

export function GameProvider({ roomId, children }: { roomId: string; children: ReactNode; }) {
  const room = useGameRoom(roomId);
  const controls = useTouchControls();
  const media = useGameMedia(room.peerId, room.connections); // pass explicit peer? room.peerId used as key/id
  // useGameMedia needs the actual peer object usually, which is inside room.
  // We need to expose it from useGameRoom.

  return (
    <GameContext.Provider value={{ ...room, controls, media }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  return useContext(GameContext);
}
