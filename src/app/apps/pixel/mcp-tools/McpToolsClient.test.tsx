import { render, screen } from "@testing-library/react";
import { SessionProvider } from "next-auth/react";
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

// Helper to wrap component with SessionProvider
const renderWithSession = (ui: React.ReactElement) => {
  return render(
    <SessionProvider session={null}>
      {ui}
    </SessionProvider>,
  );
};

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
      renderWithSession(<McpToolsClient isLoggedIn={false} />);
      expect(screen.getByText("MCP Tools")).toBeDefined();
    });

    it("shows API key required message when not logged in", () => {
      renderWithSession(<McpToolsClient isLoggedIn={false} />);
      expect(screen.getByText("API Key Required")).toBeDefined();
    });

    it("shows authentication message when logged in", () => {
      renderWithSession(<McpToolsClient isLoggedIn={true} />);
      expect(screen.getByText("Authentication")).toBeDefined();
    });

    it("shows session authentication success message when logged in", () => {
      renderWithSession(<McpToolsClient isLoggedIn={true} />);
      expect(
        screen.getByText("Using session authentication (no API key needed)"),
      ).toBeDefined();
    });

    it("renders all tab triggers", () => {
      renderWithSession(<McpToolsClient isLoggedIn={true} />);
      expect(screen.getAllByText("Generate").length).toBeGreaterThan(0);
      expect(screen.getByText("Modify")).toBeDefined();
      expect(screen.getByText("Job Status")).toBeDefined();
      expect(screen.getByText("Balance")).toBeDefined();
    });

    it("renders API documentation section", () => {
      renderWithSession(<McpToolsClient isLoggedIn={true} />);
      expect(screen.getByText("API Documentation")).toBeDefined();
    });
  });

  describe("Authentication", () => {
    it("shows optional API key input when logged in", () => {
      renderWithSession(<McpToolsClient isLoggedIn={true} />);
      const apiKeyInput = screen.getByPlaceholderText(
        /sk_live_.*leave empty to use session/,
      );
      expect(apiKeyInput).toBeDefined();
    });

    it("requires API key when not logged in", () => {
      renderWithSession(<McpToolsClient isLoggedIn={false} />);
      const apiKeyInput = screen.getByPlaceholderText(/sk_live_.../);
      expect(apiKeyInput).toBeDefined();
    });
  });

  describe("Token Costs Display", () => {
    it("displays tier costs in pricing information", () => {
      renderWithSession(<McpToolsClient isLoggedIn={true} />);
      // Token costs are shown in badges in the Balance tab
      const badges = screen.getAllByText(/tokens/i);
      expect(badges.length).toBeGreaterThan(0);
    });

    it("displays tier cost in Generate tab", () => {
      renderWithSession(<McpToolsClient isLoggedIn={true} />);
      expect(screen.getByText(/Cost:.*tokens/)).toBeDefined();
    });
  });

  describe("API Documentation", () => {
    it("shows curl examples for all endpoints", () => {
      renderWithSession(<McpToolsClient isLoggedIn={true} />);
      // These headers appear in the API documentation section
      expect(screen.getAllByText(/Generate Image/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Modify Image/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Check.*Status/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Check Balance/i).length).toBeGreaterThan(0);
    });

    it("includes MCP server installation instructions", () => {
      renderWithSession(<McpToolsClient isLoggedIn={true} />);
      expect(screen.getAllByText(/MCP Server/i).length).toBeGreaterThan(0);
    });
  });
});
