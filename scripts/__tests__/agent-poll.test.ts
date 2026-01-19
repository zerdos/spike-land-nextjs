/**
 * Unit tests for agent-poll.ts
 *
 * Tests the exported helper functions without requiring Redis/Prisma connections.
 * These functions are pure or have minimal external dependencies.
 */

import { describe, expect, it } from "vitest";

import { findTestKeywordHandler, maskApiKey, TEST_KEYWORD_HANDLERS } from "../agent-poll";

// ============================================================
// maskApiKey Tests
// ============================================================

describe("maskApiKey", () => {
  it("returns '(not set)' for undefined input", () => {
    expect(maskApiKey(undefined)).toBe("(not set)");
  });

  it("returns '(not set)' for empty string", () => {
    expect(maskApiKey("")).toBe("(not set)");
  });

  it("masks short keys (< 12 chars) showing only first 4 chars", () => {
    expect(maskApiKey("abc")).toBe("abc...");
    expect(maskApiKey("abcd1234")).toBe("abcd...");
    expect(maskApiKey("12345678901")).toBe("1234..."); // 11 chars - still short
  });

  it("masks normal keys showing first 4 and last 4 chars", () => {
    expect(maskApiKey("sk-abc123456789xyz")).toBe("sk-a...9xyz");
    expect(maskApiKey("123456789012")).toBe("1234...9012"); // exactly 12 chars
    expect(maskApiKey("1234567890123")).toBe("1234...0123"); // 13 chars
  });

  it("handles long API keys correctly", () => {
    const longKey = "sk-ant-api03-" + "a".repeat(100);
    expect(maskApiKey(longKey)).toBe("sk-a...aaaa");
  });
});

// ============================================================
// findTestKeywordHandler Tests
// ============================================================

describe("findTestKeywordHandler", () => {
  it("returns null for regular messages (no test keyword)", () => {
    expect(findTestKeywordHandler("Hello, how are you?")).toBeNull();
    expect(findTestKeywordHandler("Build me a todo app")).toBeNull();
    expect(findTestKeywordHandler("")).toBeNull();
  });

  it("finds E2E_TEST_ECHO handler", () => {
    const result = findTestKeywordHandler("E2E_TEST_ECHO:hello");
    expect(result).not.toBeNull();
    expect(result?.keyword).toBe("E2E_TEST_ECHO:");
  });

  it("finds E2E_TEST_CODE_UPDATE handler", () => {
    const result = findTestKeywordHandler("E2E_TEST_CODE_UPDATE");
    expect(result).not.toBeNull();
    expect(result?.keyword).toBe("E2E_TEST_CODE_UPDATE");
  });

  it("finds E2E_TEST_ERROR handler", () => {
    const result = findTestKeywordHandler("E2E_TEST_ERROR");
    expect(result).not.toBeNull();
    expect(result?.keyword).toBe("E2E_TEST_ERROR");
  });

  it("finds E2E_TEST_DELAY handler", () => {
    const result = findTestKeywordHandler("E2E_TEST_DELAY:500");
    expect(result).not.toBeNull();
    expect(result?.keyword).toBe("E2E_TEST_DELAY:");
  });

  it("finds E2E_TEST_MCP handler", () => {
    const result = findTestKeywordHandler("E2E_TEST_MCP:my-codespace");
    expect(result).not.toBeNull();
    expect(result?.keyword).toBe("E2E_TEST_MCP:");
  });

  it("is case sensitive - lowercase should not match", () => {
    expect(findTestKeywordHandler("e2e_test_echo:hello")).toBeNull();
    expect(findTestKeywordHandler("E2e_Test_Echo:hello")).toBeNull();
  });

  it("requires exact prefix match", () => {
    expect(findTestKeywordHandler(" E2E_TEST_ECHO:hello")).toBeNull(); // leading space
    expect(findTestKeywordHandler("XE2E_TEST_ECHO:hello")).toBeNull(); // extra char
  });

  it("matches when keyword is the entire message", () => {
    const result = findTestKeywordHandler("E2E_TEST_CODE_UPDATE");
    expect(result).not.toBeNull();
  });
});

// ============================================================
// TEST_KEYWORD_HANDLERS Tests
// ============================================================

describe("TEST_KEYWORD_HANDLERS", () => {
  describe("E2E_TEST_ECHO handler", () => {
    it("echoes back the message content", async () => {
      const handler = TEST_KEYWORD_HANDLERS["E2E_TEST_ECHO:"];
      const result = await handler!("E2E_TEST_ECHO:hello world", "test-app-id");

      expect(result.response).toBe("ECHO: hello world");
      expect(result.codeUpdated).toBe(false);
      expect(result.error).toBeUndefined();
    });

    it("handles empty message after keyword", async () => {
      const handler = TEST_KEYWORD_HANDLERS["E2E_TEST_ECHO:"];
      const result = await handler!("E2E_TEST_ECHO:", "test-app-id");

      expect(result.response).toBe("ECHO: ");
      expect(result.codeUpdated).toBe(false);
    });

    it("preserves special characters in echo", async () => {
      const handler = TEST_KEYWORD_HANDLERS["E2E_TEST_ECHO:"];
      const result = await handler!(
        "E2E_TEST_ECHO:<script>alert('xss')</script>",
        "test-app-id",
      );

      expect(result.response).toBe("ECHO: <script>alert('xss')</script>");
    });
  });

  describe("E2E_TEST_CODE_UPDATE handler", () => {
    it("simulates code update with codespace ID", async () => {
      const handler = TEST_KEYWORD_HANDLERS["E2E_TEST_CODE_UPDATE"];
      const result = await handler!("E2E_TEST_CODE_UPDATE", "my-app-123");

      expect(result.codeUpdated).toBe(true);
      expect(result.codespaceId).toBe("e2e-test-my-app-123");
      expect(result.response).toContain("Mock code update completed");
      expect(result.error).toBeUndefined();
    });
  });

  describe("E2E_TEST_ERROR handler", () => {
    it("simulates an error response", async () => {
      const handler = TEST_KEYWORD_HANDLERS["E2E_TEST_ERROR"];
      const result = await handler!("E2E_TEST_ERROR", "test-app-id");

      expect(result.error).toBe("E2E_TEST_ERROR triggered");
      expect(result.response).toBe("Simulated error for E2E testing");
      expect(result.codeUpdated).toBe(false);
    });
  });

  describe("E2E_TEST_DELAY handler", () => {
    it("parses delay from message and returns after waiting", async () => {
      const handler = TEST_KEYWORD_HANDLERS["E2E_TEST_DELAY:"];

      const start = Date.now();
      const result = await handler!("E2E_TEST_DELAY:100", "test-app-id");
      const elapsed = Date.now() - start;

      expect(result.response).toBe("Delayed response after 100ms");
      expect(result.codeUpdated).toBe(false);
      // Should have waited at least 100ms (with small tolerance for timing)
      expect(elapsed).toBeGreaterThanOrEqual(90);
    });

    it("defaults to 1000ms when no number provided", async () => {
      const handler = TEST_KEYWORD_HANDLERS["E2E_TEST_DELAY:"];

      const start = Date.now();
      const result = await handler!("E2E_TEST_DELAY:abc", "test-app-id"); // invalid number
      const elapsed = Date.now() - start;

      expect(result.response).toBe("Delayed response after 1000ms");
      // Should have waited at least 1000ms
      expect(elapsed).toBeGreaterThanOrEqual(950);
    }, 5000); // Increase timeout for this test

    it("caps delay at 30 seconds", async () => {
      const handler = TEST_KEYWORD_HANDLERS["E2E_TEST_DELAY:"];

      // Request 60 seconds, should be capped to 30
      const result = await handler!("E2E_TEST_DELAY:60000", "test-app-id");

      // Response should show capped value
      expect(result.response).toBe("Delayed response after 30000ms");
    }, 35000); // Allow time for 30s delay
  });

  describe("E2E_TEST_MCP handler", () => {
    it("simulates MCP integration with custom codespace ID", async () => {
      const handler = TEST_KEYWORD_HANDLERS["E2E_TEST_MCP:"];
      const result = await handler!("E2E_TEST_MCP:custom-codespace", "test-app-id");

      expect(result.codespaceId).toBe("custom-codespace");
      expect(result.codeUpdated).toBe(true);
      expect(result.response).toContain("MCP integration test completed");
    });

    it("generates default codespace ID when none provided", async () => {
      const handler = TEST_KEYWORD_HANDLERS["E2E_TEST_MCP:"];
      const result = await handler!("E2E_TEST_MCP:", "my-app");

      expect(result.codespaceId).toBe("e2e-mcp-my-app");
      expect(result.codeUpdated).toBe(true);
    });
  });
});
