import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PLATFORM_CHARACTER_LIMITS, useStreamActions } from "./useStreamActions";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Create a wrapper for React Query
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode; }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("PLATFORM_CHARACTER_LIMITS", () => {
  it("has correct limit for TWITTER", () => {
    expect(PLATFORM_CHARACTER_LIMITS.TWITTER).toBe(280);
  });

  it("has correct limit for FACEBOOK", () => {
    expect(PLATFORM_CHARACTER_LIMITS.FACEBOOK).toBe(8000);
  });

  it("has correct limit for INSTAGRAM", () => {
    expect(PLATFORM_CHARACTER_LIMITS.INSTAGRAM).toBe(2200);
  });

  it("has correct limit for LINKEDIN", () => {
    expect(PLATFORM_CHARACTER_LIMITS.LINKEDIN).toBe(3000);
  });

  it("has correct limit for TIKTOK", () => {
    expect(PLATFORM_CHARACTER_LIMITS.TIKTOK).toBe(150);
  });

  it("has correct limit for YOUTUBE", () => {
    expect(PLATFORM_CHARACTER_LIMITS.YOUTUBE).toBe(10000);
  });
});

describe("useStreamActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts with no loading states", () => {
    const { result } = renderHook(() => useStreamActions("workspace-123"), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLiking).toBe(false);
    expect(result.current.isUnliking).toBe(false);
    expect(result.current.isReplying).toBe(false);
  });

  it("returns getCharacterLimit function", () => {
    const { result } = renderHook(() => useStreamActions("workspace-123"), {
      wrapper: createWrapper(),
    });

    expect(result.current.getCharacterLimit("TWITTER")).toBe(280);
    expect(result.current.getCharacterLimit("FACEBOOK")).toBe(8000);
    expect(result.current.getCharacterLimit("INSTAGRAM")).toBe(2200);
    expect(result.current.getCharacterLimit("LINKEDIN")).toBe(3000);
  });

  describe("likePost", () => {
    it("calls the like API with correct parameters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { result } = renderHook(() => useStreamActions("workspace-123"), {
        wrapper: createWrapper(),
      });

      await act(() => result.current.likePost("post-123", "TWITTER", "account-456"));

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/social/twitter/posts/post-123/like",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ accountId: "account-456" }),
        }),
      );
    });

    it("sets isLiking loading state", async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useStreamActions("workspace-123"), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.likePost("post-123", "TWITTER", "account-456");
      });

      await waitFor(() => {
        expect(result.current.isLiking).toBe(true);
      });
    });

    it("throws error when API returns error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Failed to like" }),
      });

      const { result } = renderHook(() => useStreamActions("workspace-123"), {
        wrapper: createWrapper(),
      });

      await expect(
        act(() => result.current.likePost("post-123", "TWITTER", "account-456")),
      ).rejects.toThrow("Failed to like");
    });
  });

  describe("unlikePost", () => {
    it("calls the unlike API with DELETE method", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { result } = renderHook(() => useStreamActions("workspace-123"), {
        wrapper: createWrapper(),
      });

      await act(() => result.current.unlikePost("post-123", "TWITTER", "account-456"));

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/social/twitter/posts/post-123/like?accountId=account-456",
        expect.objectContaining({
          method: "DELETE",
        }),
      );
    });

    it("sets isUnliking loading state", async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useStreamActions("workspace-123"), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.unlikePost("post-123", "TWITTER", "account-456");
      });

      await waitFor(() => {
        expect(result.current.isUnliking).toBe(true);
      });
    });
  });

  describe("replyToPost", () => {
    it("calls the reply API with content", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            reply: { id: "reply-123", url: "https://twitter.com/reply" },
          }),
      });

      const { result } = renderHook(() => useStreamActions("workspace-123"), {
        wrapper: createWrapper(),
      });

      await act(() =>
        result.current.replyToPost(
          "post-123",
          "TWITTER",
          "account-456",
          "Test reply",
        )
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/social/twitter/posts/post-123/reply",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            accountId: "account-456",
            content: "Test reply",
          }),
        }),
      );
    });

    it("sets isReplying loading state", async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useStreamActions("workspace-123"), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.replyToPost(
          "post-123",
          "TWITTER",
          "account-456",
          "Test",
        );
      });

      await waitFor(() => {
        expect(result.current.isReplying).toBe(true);
      });
    });

    it("throws error when reply API fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Failed to reply" }),
      });

      const { result } = renderHook(() => useStreamActions("workspace-123"), {
        wrapper: createWrapper(),
      });

      await expect(
        act(() =>
          result.current.replyToPost(
            "post-123",
            "TWITTER",
            "account-456",
            "Test",
          )
        ),
      ).rejects.toThrow("Failed to reply");
    });
  });

  describe("URL encoding", () => {
    it("encodes postId with special characters in like URL", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { result } = renderHook(() => useStreamActions("workspace-123"), {
        wrapper: createWrapper(),
      });

      await act(() => result.current.likePost("post/123&test", "TWITTER", "account-456"));

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("post%2F123%26test"),
        expect.anything(),
      );
    });

    it("encodes accountId with special characters in unlike URL", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { result } = renderHook(() => useStreamActions("workspace-123"), {
        wrapper: createWrapper(),
      });

      await act(() => result.current.unlikePost("post-123", "TWITTER", "account/456"));

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("accountId=account%2F456"),
        expect.anything(),
      );
    });
  });

  describe("platform case handling", () => {
    it("converts platform to lowercase in API URL", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { result } = renderHook(() => useStreamActions("workspace-123"), {
        wrapper: createWrapper(),
      });

      await act(() => result.current.likePost("post-123", "FACEBOOK", "account-456"));

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/social/facebook/"),
        expect.anything(),
      );
    });
  });
});
