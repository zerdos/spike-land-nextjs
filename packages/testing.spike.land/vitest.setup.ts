// Setup file for Vitest tests
// Provides Cloudflare Workers globals that are missing in Node.js environment

import { vi } from "vitest";

// Mock WebSocketPair for Cloudflare Workers compatibility
class MockWebSocket {
  readyState = 1;
  accept = vi.fn();
  send = vi.fn();
  close = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
}

class MockWebSocketPair {
  0: MockWebSocket;
  1: MockWebSocket;

  constructor() {
    this[0] = new MockWebSocket();
    this[1] = new MockWebSocket();
  }

  [Symbol.iterator]() {
    return [this[0], this[1]][Symbol.iterator]();
  }
}

// Stub WebSocketPair globally
vi.stubGlobal("WebSocketPair", MockWebSocketPair);
