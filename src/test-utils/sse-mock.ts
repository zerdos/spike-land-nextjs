import { vi } from "vitest";

// Types for stream events used in create/stream endpoint
export type StreamEventType =
  | { type: "agent"; name: string; model: string }
  | { type: "status"; message: string }
  | { type: "phase"; phase: string; message: string; iteration?: number }
  | { type: "code_generated"; codePreview: string }
  | { type: "error_detected"; error: string; iteration: number }
  | { type: "error_fixed"; iteration: number }
  | { type: "learning"; notePreview: string }
  | {
    type: "complete";
    slug?: string;
    url?: string;
    title?: string;
    description?: string;
    relatedApps?: string[];
    agent?: string;
  }
  | { type: "error"; message: string; codespaceUrl?: string }
  | { type: "heartbeat"; timestamp: number }
  | { type: "timeout"; message: string; codespaceUrl?: string };

// Types for vibe-chat events
export type VibeChatEvent =
  | { type: "stage"; stage: string }
  | { type: "chunk"; content: string }
  | { type: "code_updated" }
  | { type: "error"; content?: string; message?: string }
  | { type: "complete" };

/**
 * Creates a ReadableStream from an array of SSE events.
 * Each event is encoded as `data: ${JSON.stringify(event)}\n\n`
 */
export function createSSEStream(
  events: Record<string, unknown>[],
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const chunks = events.map((e) => `data: ${JSON.stringify(e)}\n\n`);

  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

/**
 * Creates a ReadableStream that delivers events in multiple chunks
 * (simulates network chunking where events may be split across reads)
 */
export function createChunkedSSEStream(
  events: Record<string, unknown>[],
  chunkSize?: number,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const fullData = events
    .map((e) => `data: ${JSON.stringify(e)}\n\n`)
    .join("");
  const size = chunkSize || Math.ceil(fullData.length / 3);

  return new ReadableStream({
    start(controller) {
      for (let i = 0; i < fullData.length; i += size) {
        controller.enqueue(encoder.encode(fullData.slice(i, i + size)));
      }
      controller.close();
    },
  });
}

/**
 * Creates a mock Response object with SSE stream
 */
export function createSSEResponse(
  events: Record<string, unknown>[],
  options?: { status?: number; ok?: boolean },
): Response {
  return {
    ok: options?.ok ?? true,
    status: options?.status ?? 200,
    statusText: "OK",
    body: createSSEStream(events),
    headers: new Headers({ "Content-Type": "text/event-stream" }),
  } as unknown as Response;
}

/**
 * Creates a mock fetch that returns an SSE response
 */
export function createMockFetchWithSSE(
  events: Record<string, unknown>[],
): ReturnType<typeof vi.fn> {
  return vi.fn().mockResolvedValue(createSSEResponse(events));
}

// Event factory helpers
export const sseEvents = {
  agent: (name: string, model: string): StreamEventType => ({
    type: "agent",
    name,
    model,
  }),
  status: (message: string): StreamEventType => ({
    type: "status",
    message,
  }),
  phase: (
    phase: string,
    message: string,
    iteration?: number,
  ): StreamEventType => ({ type: "phase", phase, message, iteration }),
  codeGenerated: (codePreview: string): StreamEventType => ({
    type: "code_generated",
    codePreview,
  }),
  errorDetected: (error: string, iteration: number): StreamEventType => ({
    type: "error_detected",
    error,
    iteration,
  }),
  errorFixed: (iteration: number): StreamEventType => ({
    type: "error_fixed",
    iteration,
  }),
  learning: (notePreview: string): StreamEventType => ({
    type: "learning",
    notePreview,
  }),
  complete: (
    data?: Partial<Extract<StreamEventType, { type: "complete" }>>,
  ): StreamEventType => ({
    type: "complete",
    slug: "test",
    url: "/test",
    title: "Test",
    description: "Test app",
    relatedApps: [],
    ...data,
  }),
  error: (message: string, codespaceUrl?: string): StreamEventType => ({
    type: "error",
    message,
    codespaceUrl,
  }),
  heartbeat: (timestamp?: number): StreamEventType => ({
    type: "heartbeat",
    timestamp: timestamp ?? Date.now(),
  }),
  timeout: (message: string, codespaceUrl?: string): StreamEventType => ({
    type: "timeout",
    message,
    codespaceUrl,
  }),
};

export const vibeChatEvents = {
  stage: (stage: string): VibeChatEvent => ({ type: "stage", stage }),
  chunk: (content: string): VibeChatEvent => ({ type: "chunk", content }),
  codeUpdated: (): VibeChatEvent => ({ type: "code_updated" }),
  error: (content: string): VibeChatEvent => ({ type: "error", content }),
  complete: (): VibeChatEvent => ({ type: "complete" }),
};
