import { render, screen } from "@testing-library/react";
import type { Session } from "next-auth";
import { redirect } from "next/navigation";
import { describe, expect, it, vi } from "vitest";
import McpHistoryPage, { metadata } from "./page";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("./McpHistoryClient", () => ({
  McpHistoryClient: () => <div data-testid="mcp-history-client">MCP History Client</div>,
}));

describe("McpHistoryPage", async () => {
  const mockAuth = vi.mocked((await import("@/auth")).auth);

  describe("metadata", () => {
    it("should have correct title", () => {
      expect(metadata.title).toBe("MCP Usage History - Spike Land");
    });

    it("should have correct description", () => {
      expect(metadata.description).toBe(
        "View your MCP API usage history for image generation and modification",
      );
    });
  });

  describe("Authentication", () => {
    it("should redirect to signin when no session exists", async () => {
      mockAuth.mockResolvedValue(null);
      await expect(McpHistoryPage()).rejects.toThrow("NEXT_REDIRECT");
      expect(redirect).toHaveBeenCalledWith("/auth/signin");
    });

    it("should redirect when session is explicitly null", async () => {
      mockAuth.mockResolvedValue(null as unknown as Session);
      await expect(McpHistoryPage()).rejects.toThrow("NEXT_REDIRECT");
      expect(redirect).toHaveBeenCalledWith("/auth/signin");
    });
  });

  describe("Authenticated User", () => {
    const mockSession: Session = {
      user: {
        id: "user-123",
        name: "Test User",
        email: "test@example.com",
        role: "USER",
      },
      expires: "2024-12-31",
    };

    it("should render McpHistoryClient when authenticated", async () => {
      mockAuth.mockResolvedValue(mockSession);
      const page = await McpHistoryPage();
      render(page as React.ReactElement);
      expect(screen.getByTestId("mcp-history-client")).toBeInTheDocument();
    });

    it("should render McpHistoryClient content", async () => {
      mockAuth.mockResolvedValue(mockSession);
      const page = await McpHistoryPage();
      render(page as React.ReactElement);
      expect(screen.getByText("MCP History Client")).toBeInTheDocument();
    });

    it("should render with user having minimal info", async () => {
      const minimalSession: Session = {
        user: {
          id: "user-456",
          role: "USER",
        },
        expires: "2024-12-31",
      };
      mockAuth.mockResolvedValue(minimalSession);
      const page = await McpHistoryPage();
      render(page as React.ReactElement);
      expect(screen.getByTestId("mcp-history-client")).toBeInTheDocument();
    });

    it("should render with user having image", async () => {
      const sessionWithImage: Session = {
        user: {
          id: "user-789",
          name: "Image User",
          email: "image@example.com",
          image: "https://example.com/avatar.jpg",
          role: "USER",
        },
        expires: "2024-12-31",
      };
      mockAuth.mockResolvedValue(sessionWithImage);
      const page = await McpHistoryPage();
      render(page as React.ReactElement);
      expect(screen.getByTestId("mcp-history-client")).toBeInTheDocument();
    });
  });
});
