// Mock implementation of replicate
import { vi } from "vitest";

// Create a mock class that can be instantiated with `new Replicate()`
class MockReplicate {
  constructor(options) {
    this.auth = options?.auth;
    this.run = vi.fn().mockResolvedValue(["https://replicate.delivery/mock-image.webp"]);
    this.models = {
      get: vi.fn().mockResolvedValue({
        name: "mock-model",
        version: "mock-version",
      }),
    };
  }
}

// Make it mockable for tests that need to customize behavior
const Replicate = vi.fn().mockImplementation((options) => new MockReplicate(options));

// Also expose the mock class for direct usage
Replicate.MockReplicate = MockReplicate;

export default Replicate;
