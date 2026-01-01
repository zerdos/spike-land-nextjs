"use client";
import Peer from "peerjs";
import { useCallback, useState } from "react";

export function useGameMedia(
  peer: Peer | null,
  connections: Map<string, { dataConnection: unknown; }>,
) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());

  const enableMedia = useCallback(async (video: boolean = true, audio: boolean = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video, audio });
      setLocalStream(stream);
      return stream;
    } catch (e) {
      console.error("Failed to get media", e);
      return null;
    }
  }, []);

  const callAll = useCallback(() => {
    if (!localStream || !peer) return;

    // Naively call keys in connections map
    // In real app, check if already called
    connections.forEach((_: { dataConnection: unknown; }, peerId: string) => {
      const call = peer.call(peerId, localStream);
      call.on("stream", (remoteStream: MediaStream) => {
        setRemoteStreams(prev => new Map(prev).set(peerId, remoteStream));
      });
    });
  }, [localStream, peer, connections]);

  // Also need to listen for incoming calls (should be in useGameRoom or here)
  // peer.on('call', ...) -> answer

  return { localStream, remoteStreams, enableMedia, callAll };
}
