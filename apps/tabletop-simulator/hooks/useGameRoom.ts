"use client";
import { useEffect } from "react";
import { usePeer } from "./usePeer";
import { usePeerConnection } from "./usePeerConnection";
import { usePeerDataChannel } from "./usePeerDataChannel";
import { useYjsSync } from "./useYjsSync";

export function useGameRoom(roomId: string) {
  const { doc, isSynced } = useYjsSync(roomId);
  const { peer, peerId } = usePeer();
  const { connections, connectData } = usePeerConnection(peer);

  const { handleIncomingData } = usePeerDataChannel(doc, connections);

  // When we connect, we should ensure our data is processed
  // But usePeerDataChannel effectively watches doc and connections.

  // We also need to listen to incoming data on the connections
  useEffect(() => {
    connections.forEach((conn) => {
      if (conn.dataConnection) {
        // Remove old listeners to avoid duplicates?
        // Ideally usePeerDataChannel attaches a single handler or we attach it here.
        // Since usePeerDataChannel returns `handleIncomingData`, we attach it here.

        // Check if listener attached? PeerJS event emitter doesn't easily dedup.
        // Simplification: assume usePeerDataChannel attached it?
        // No, usePeerDataChannel example I wrote above didn't attach to 'data' event of connection because connections was passed in.
        // Modifying logic: We attach here.

        conn.dataConnection.off("data");
        conn.dataConnection.on("data", (data) => {
          handleIncomingData(data);
        });
      }
    });
  }, [connections, handleIncomingData]);

  // Auto-join if roomId implies a host or we need to join known peers?
  // For P2P, we need a signaling mechanism or manual "Connect to Peer ID".
  // RoomID here might be just for local persistence key.
  // We'll expose `connectToPeer` for the UI.

  // Add self to game loop if new
  useEffect(() => {
    if (isSynced && peerId) {
      // Check if I exist in doc?
      // addPlayer(doc, ...);
    }
  }, [isSynced, peerId, doc]);

  return {
    doc,
    peer,
    peerId,
    connections,
    connectToPeer: connectData,
    isSynced,
  };
}
