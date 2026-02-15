import { vi } from "vitest";
import { setupAllMocks } from "./test-mocks";

// Mock WebSocket for tests
class MockWebSocket {
  constructor(url: string) {
    console.log("Mock WebSocket created with URL:", url); // For debugging
  }
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  dispatchEvent = vi.fn();
  send = vi.fn();
  close = vi.fn();
}

setupAllMocks();

vi.stubGlobal("WebSocket", MockWebSocket);
