import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { McpToolsClient } from "./McpToolsClient";

const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

// Mock FileReader
class MockFileReader {
  result: string | null = null;
  onload: (() => void) | null = null;
  onerror: ((error: unknown) => void) | null = null;

  readAsDataURL(file: Blob) {
    setTimeout(() => {
      this.result = `data:${file.type};base64,mockbase64data`;
      if (this.onload) this.onload();
    }, 0);
  }
}

global.FileReader = MockFileReader as unknown as typeof FileReader;

describe("McpToolsClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ apiKeys: [] }),
    });
  });

  describe("Initial Rendering", () => {
    it("renders the MCP Tools heading", () => {
      render(<McpToolsClient isLoggedIn={false} />);
      expect(screen.getByText("MCP Tools")).toBeDefined();
    });

    it("shows API key required message when not logged in", () => {
      render(<McpToolsClient isLoggedIn={false} />);
      expect(screen.getByText("API Key Required")).toBeDefined();
    });

    it("shows authentication message when logged in", () => {
      render(<McpToolsClient isLoggedIn={true} />);
      expect(screen.getByText("Authentication")).toBeDefined();
    });

    it("shows session authentication success message when logged in", () => {
      render(<McpToolsClient isLoggedIn={true} />);
      expect(
        screen.getByText("Using session authentication (no API key needed)"),
      ).toBeDefined();
    });

    it("renders all tab triggers", () => {
      render(<McpToolsClient isLoggedIn={true} />);
      expect(screen.getByText("Generate")).toBeDefined();
      expect(screen.getByText("Modify")).toBeDefined();
      expect(screen.getByText("Job Status")).toBeDefined();
      expect(screen.getByText("Balance")).toBeDefined();
    });

    it("renders API documentation section", () => {
      render(<McpToolsClient isLoggedIn={true} />);
      expect(screen.getByText("API Documentation")).toBeDefined();
    });
  });

  describe("Authentication", () => {
    it("shows optional API key input when logged in", () => {
      render(<McpToolsClient isLoggedIn={true} />);
      const apiKeyInput = screen.getByPlaceholderText(
        /sk_live_.*leave empty to use session/,
      );
      expect(apiKeyInput).toBeDefined();
    });

    it("requires API key when not logged in", () => {
      render(<McpToolsClient isLoggedIn={false} />);
      const apiKeyInput = screen.getByPlaceholderText(/sk_live_.../);
      expect(apiKeyInput).toBeDefined();
    });
  });

  describe("Token Costs Display", () => {
    it("displays tier costs in the Balance tab", () => {
      render(<McpToolsClient isLoggedIn={true} />);
      expect(screen.getByText("2 tokens")).toBeDefined();
      expect(screen.getByText("5 tokens")).toBeDefined();
      expect(screen.getByText("10 tokens")).toBeDefined();
    });

    it("displays default tier cost in Generate tab", () => {
      render(<McpToolsClient isLoggedIn={true} />);
      expect(screen.getByText("Cost: 2 tokens")).toBeDefined();
    });
  });

  describe("API Documentation", () => {
    it("shows curl examples for all endpoints", () => {
      render(<McpToolsClient isLoggedIn={true} />);
      expect(screen.getByText("Generate Image")).toBeDefined();
      expect(screen.getByText("Modify Image")).toBeDefined();
      expect(screen.getByText("Check Job Status")).toBeDefined();
      expect(screen.getByText("Check Balance")).toBeDefined();
    });

    it("includes MCP server installation instructions", () => {
      render(<McpToolsClient isLoggedIn={true} />);
      expect(screen.getByText(/MCP Server.*Claude Desktop/)).toBeDefined();
    });
  });
});
