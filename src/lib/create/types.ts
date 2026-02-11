export type AgentPhase =
  | "PLANNING"
  | "GENERATING"
  | "TRANSPILING"
  | "VERIFYING"
  | "FIXING"
  | "LEARNING"
  | "PUBLISHED"
  | "FAILED";

export type StreamEvent =
  | { type: "agent"; name: string; model: string }
  | { type: "status"; message: string }
  | { type: "phase"; phase: AgentPhase; message: string; iteration?: number }
  | { type: "code_generated"; codePreview: string }
  | { type: "error_detected"; error: string; iteration: number }
  | { type: "error_fixed"; iteration: number }
  | { type: "learning"; notePreview: string }
  | {
    type: "complete";
    slug: string;
    url: string;
    title: string;
    description: string;
    relatedApps: string[];
    agent?: string;
  }
  | { type: "error"; message: string; codespaceUrl?: string }
  | { type: "heartbeat"; timestamp: number }
  | { type: "timeout"; message: string; codespaceUrl?: string };
