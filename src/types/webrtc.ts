/**
 * WebRTC and PeerJS type definitions for the smart video wall application
 */

import type { DataConnection, MediaConnection, Peer } from "peerjs";

/**
 * Connection status for a peer connection
 */
type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "failed"
  | "closed";

/**
 * Role of a peer in the video wall system
 */
type PeerRole = "host" | "client";

/**
 * Metadata for a client connection
 */
export interface ClientMetadata {
  /** Unique identifier for the client */
  id: string;
  /** Display name or label for the client */
  name: string;
  /** When the client connected */
  connectedAt: Date;
  /** Current connection status */
  status: ConnectionStatus;
}

/**
 * Information about a media stream
 */
export interface StreamMetadata {
  /** ID of the peer sending the stream */
  peerId: string;
  /** Type of media in the stream */
  streamType: "video" | "audio" | "screen";
  /** Whether the stream is currently active */
  isActive: boolean;
  /** Video track settings if available */
  videoSettings?: {
    width: number;
    height: number;
    frameRate: number;
  };
}

/**
 * Configuration for initializing a peer connection
 */
export interface PeerConfig {
  /** Custom peer ID (optional, will be auto-generated if not provided) */
  peerId?: string;
  /** Role of this peer in the system */
  role: PeerRole;
  /** Custom PeerJS server configuration (optional) */
  serverConfig?: {
    host: string;
    port: number;
    path: string;
    secure: boolean;
  };
}

/**
 * State of a peer connection
 */
export interface PeerConnectionState {
  /** The PeerJS instance */
  peer: Peer | null;
  /** Current peer ID */
  peerId: string | null;
  /** Connection status */
  status: ConnectionStatus;
  /** Error message if connection failed */
  error: string | null;
}

/**
 * State of a client connection (from host's perspective)
 */
export interface ClientConnectionState {
  /** Client metadata */
  client: ClientMetadata;
  /** Data connection to the client */
  dataConnection: DataConnection | null;
  /** Media connection from the client */
  mediaConnection: MediaConnection | null;
  /** The media stream from the client */
  stream: MediaStream | null;
  /** Stream metadata */
  streamMetadata: StreamMetadata | null;
}

/**
 * Message types for data channel communication
 */
type MessageType =
  | "ping"
  | "pong"
  | "stream-start"
  | "stream-stop"
  | "metadata-update"
  | "error";

/**
 * Structure of messages sent over the data channel
 */
export interface PeerMessage<T = unknown> {
  /** Type of the message */
  type: MessageType;
  /** Message payload */
  payload?: T;
  /** Timestamp when message was created */
  timestamp: number;
}

/**
 * Error types that can occur in WebRTC connections
 */
export type WebRTCError =
  | "peer-unavailable"
  | "connection-failed"
  | "stream-failed"
  | "permission-denied"
  | "browser-not-supported"
  | "network-error"
  | "unknown";

/**
 * Error information
 */
export interface WebRTCErrorInfo {
  /** Type of error */
  type: WebRTCError;
  /** Error message */
  message: string;
  /** Original error object if available */
  originalError?: Error;
}

/**
 * Media constraints for getUserMedia
 */
export interface MediaConstraints {
  /** Video constraints */
  video: MediaTrackConstraints | boolean;
  /** Audio constraints */
  audio: MediaTrackConstraints | boolean;
}
