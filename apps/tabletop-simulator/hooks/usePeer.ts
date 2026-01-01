"use client";
import Peer from "peerjs";
import React, { useEffect, useRef, useState } from "react";

export function usePeer() {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [peerId, setPeerId] = useState<string | null>(null);

  useEffect(() => {
    // Generate random ID or let PeerJS do it
    const id = Math.random().toString(36).substr(2, 9);
    const newPeer = new Peer(id, {
      debug: 2,
    });

    newPeer.on("open", (id) => {
      setPeer(newPeer);
      setPeerId(id);
    });

    return () => {
      newPeer.destroy();
    };
  }, []);

  return { peer, peerId };
}
