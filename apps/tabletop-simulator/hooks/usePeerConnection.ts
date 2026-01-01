"use client";
import Peer, { DataConnection, MediaConnection } from "peerjs";
import { useCallback, useEffect, useRef, useState } from "react";

export function usePeerConnection(peer: Peer | null) {
  const [connections, setConnections] = useState<
    Map<string, { dataConnection: DataConnection | null; mediaConnection: MediaConnection | null; }>
  >(new Map());
  const connectionsRef = useRef(connections); // ref pattern to access current in callbacks

  useEffect(() => {
    connectionsRef.current = connections;
  }, [connections]);

  // Connect to a peer (Data)
  const connectData = useCallback((remoteId: string) => {
    if (!peer) return;
    const conn = peer.connect(remoteId);

    conn.on("open", () => {
      setConnections(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(remoteId) || { dataConnection: null, mediaConnection: null };
        newMap.set(remoteId, { ...existing, dataConnection: conn });
        return newMap;
      });
    });

    // Listen for data will be handled by usePeerDataChannel or here
    // But usePeerDataChannel expects connections map
  }, [peer]);

  // Handle incoming connections
  useEffect(() => {
    if (!peer) return;

    peer.on("connection", (conn) => {
      conn.on("open", () => {
        setConnections(prev => {
          const newMap = new Map(prev);
          const existing = newMap.get(conn.peer) || { dataConnection: null, mediaConnection: null };
          newMap.set(conn.peer, { ...existing, dataConnection: conn });
          return newMap;
        });
      });
    });
  }, [peer]);

  return { connections, connectData };
}
