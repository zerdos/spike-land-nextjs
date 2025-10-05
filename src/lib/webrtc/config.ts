/**
 * Configuration utilities for WebRTC/PeerJS
 */

import type { PeerConfig } from "@/types/webrtc";

/**
 * Get PeerJS server configuration from environment variables
 */
export function getPeerServerConfig() {
  const host = process.env.NEXT_PUBLIC_PEER_SERVER_HOST;
  const port = process.env.NEXT_PUBLIC_PEER_SERVER_PORT;
  const path = process.env.NEXT_PUBLIC_PEER_SERVER_PATH;
  const secure = process.env.NEXT_PUBLIC_PEER_SERVER_SECURE;

  // If any custom config is provided, return it
  if (host || port || path || secure) {
    return {
      host: host || "0.peerjs.com",
      port: port ? parseInt(port, 10) : 443,
      path: path || "/",
      secure: secure === "true",
    };
  }

  // Return undefined to use PeerJS defaults (cloud server)
  return undefined;
}

/**
 * Create a PeerJS configuration object
 */
export function createPeerConfig(
  role: "host" | "client",
  peerId?: string
): PeerConfig {
  return {
    peerId,
    role,
    serverConfig: getPeerServerConfig(),
  };
}

/**
 * Get the base URL for the application
 */
export function getAppBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}
