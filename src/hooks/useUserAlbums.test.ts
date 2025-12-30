import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Album } from "./useUserAlbums";
import { useUserAlbums } from "./useUserAlbums";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useUserAlbums", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockAlbums: Album[] = [
    {
      id: "album1",
      name: "My First Album",
      description: "Test album",
      privacy: "PRIVATE",
      coverImageId: "img1",
      imageCount: 5,
      previewImages: [
        { id: "img1", url: "https://example.com/img1.jpg", name: "Image 1" },
        { id: "img2", url: "https://example.com/img2.jpg", name: "Image 2" },
      ],
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    },
    {
      id: "album2",
      name: "Public Album",
      description: null,
      privacy: "PUBLIC",
      coverImageId: null,
      imageCount: 0,
      previewImages: [],
      createdAt: "2025-01-02T00:00:00.000Z",
      updatedAt: "2025-01-02T00:00:00.000Z",
    },
  ];

  describe("successful fetching", () => {
    it("should fetch albums on mount", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ albums: mockAlbums }),
      });

      const { result } = renderHook(() => useUserAlbums());

      // Initially loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.albums).toEqual([]);
      expect(result.current.error).toBeNull();

      // Wait for fetch to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.albums).toEqual(mockAlbums);
      expect(result.current.error).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith("/api/albums");
    });

    it("should filter albums by privacy level", async () => {
      const publicAlbums = mockAlbums.filter((a) => a.privacy === "PUBLIC");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ albums: publicAlbums }),
      });

      const { result } = renderHook(() => useUserAlbums({ privacy: "PUBLIC" }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.albums).toEqual(publicAlbums);
      expect(mockFetch).toHaveBeenCalledWith("/api/albums?privacy=PUBLIC");
    });

    it("should not fetch when enabled is false", async () => {
      renderHook(() => useUserAlbums({ enabled: false }));

      // Wait a bit to ensure no fetch happens
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should fetch when enabled changes from false to true", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ albums: mockAlbums }),
      });

      const { result, rerender } = renderHook(
        ({ enabled }) => useUserAlbums({ enabled }),
        { initialProps: { enabled: false } },
      );

      expect(mockFetch).not.toHaveBeenCalled();

      // Enable fetching
      rerender({ enabled: true });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.current.albums).toEqual(mockAlbums);
    });

    it("should handle empty albums array", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ albums: [] }),
      });

      const { result } = renderHook(() => useUserAlbums());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.albums).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe("error handling", () => {
    it("should handle 401 authentication error gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      });

      const { result } = renderHook(() => useUserAlbums());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.albums).toEqual([]);
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe(
        "You must be logged in to view albums",
      );
    });

    it("should handle 500 server error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      const { result } = renderHook(() => useUserAlbums());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.albums).toEqual([]);
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe(
        "Failed to fetch albums: Internal Server Error",
      );
    });

    it("should handle network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useUserAlbums());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.albums).toEqual([]);
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe("Network error");
    });

    it("should handle non-Error thrown values", async () => {
      mockFetch.mockRejectedValueOnce("String error");

      const { result } = renderHook(() => useUserAlbums());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.albums).toEqual([]);
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe("An unknown error occurred");
    });

    it("should reset albums on error", async () => {
      // First successful fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ albums: mockAlbums }),
      });

      const { result, rerender } = renderHook(
        ({ privacy }: { privacy?: "PRIVATE" | "UNLISTED" | "PUBLIC"; }) =>
          useUserAlbums({ privacy }),
        {
          initialProps: {
            privacy: undefined as "PRIVATE" | "UNLISTED" | "PUBLIC" | undefined,
          },
        },
      );

      await waitFor(() => {
        expect(result.current.albums).toEqual(mockAlbums);
      });

      // Second fetch fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Server Error",
      });

      rerender({ privacy: "PUBLIC" });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.albums).toEqual([]);
    });
  });

  describe("refetch functionality", () => {
    it("should refetch albums when refetch is called", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ albums: mockAlbums }),
      });

      const { result } = renderHook(() => useUserAlbums());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.albums).toEqual(mockAlbums);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Mock new data for refetch
      const newAlbums = [mockAlbums[0]];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ albums: newAlbums }),
      });

      // Refetch
      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.albums).toEqual(newAlbums);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should handle errors during refetch", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ albums: mockAlbums }),
      });

      const { result } = renderHook(() => useUserAlbums());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeNull();

      // Mock error for refetch
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Server Error",
      });

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.albums).toEqual([]);
    });

    it("should set loading state during refetch", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ albums: mockAlbums }),
      });

      const { result } = renderHook(() => useUserAlbums());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Mock delayed response for refetch
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ albums: [] }),
                }),
              100,
            )
          ),
      );

      act(() => {
        result.current.refetch();
      });

      // Should be loading immediately
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe("options changes", () => {
    it("should refetch when privacy option changes", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ albums: mockAlbums }),
      });

      const { result, rerender } = renderHook(
        ({ privacy }: { privacy?: "PRIVATE" | "UNLISTED" | "PUBLIC"; }) =>
          useUserAlbums({ privacy }),
        {
          initialProps: {
            privacy: undefined as "PRIVATE" | "UNLISTED" | "PUBLIC" | undefined,
          },
        },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/albums");

      // Change privacy filter
      const publicAlbums = mockAlbums.filter((a) => a.privacy === "PUBLIC");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ albums: publicAlbums }),
      });

      rerender({ privacy: "PUBLIC" });

      await waitFor(() => {
        expect(result.current.albums).toEqual(publicAlbums);
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/albums?privacy=PUBLIC");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should not refetch when unrelated props change", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ albums: mockAlbums }),
      });

      const { result, rerender } = renderHook(() => useUserAlbums());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Rerender without changing options
      rerender();

      // Wait a bit to ensure no refetch
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("return value stability", () => {
    it("should maintain stable refetch function reference", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ albums: mockAlbums }),
      });

      const { result, rerender } = renderHook(() => useUserAlbums());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const firstRefetch = result.current.refetch;

      rerender();

      expect(result.current.refetch).toBe(firstRefetch);
    });
  });
});
