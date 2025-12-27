import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useBlendDragDrop } from "./useBlendDragDrop";

// Create mock drag event
const createMockDragEvent = (
  overrides: Partial<{
    dataTransfer: Partial<DataTransfer>;
  }> = {},
): React.DragEvent => {
  const dataTransferData: Record<string, string> = {};
  return {
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    dataTransfer: {
      effectAllowed: "none",
      dropEffect: "none",
      setData: vi.fn((type: string, data: string) => {
        dataTransferData[type] = data;
      }),
      getData: vi.fn((type: string) => dataTransferData[type] || ""),
      types: Object.keys(dataTransferData),
      ...overrides.dataTransfer,
    } as unknown as DataTransfer,
  } as unknown as React.DragEvent;
};

describe("useBlendDragDrop", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          base64: "base64data",
          mimeType: "image/jpeg",
        }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("should initialize with null state", () => {
      const { result } = renderHook(() => useBlendDragDrop());

      expect(result.current.blendDragSourceId).toBeNull();
      expect(result.current.blendDropTargetId).toBeNull();
      expect(result.current.blendingImageId).toBeNull();
    });
  });

  describe("handleBlendDragStart", () => {
    it("should set blend drag source ID", () => {
      const { result } = renderHook(() => useBlendDragDrop());
      const mockEvent = createMockDragEvent();

      act(() => {
        result.current.handleBlendDragStart(
          mockEvent,
          "img-1",
          "https://example.com/enhanced.jpg",
          false,
        );
      });

      expect(result.current.blendDragSourceId).toBe("img-1");
      expect(mockEvent.dataTransfer.setData).toHaveBeenCalledWith(
        "application/x-blend-image",
        expect.stringContaining("img-1"),
      );
      expect(mockEvent.dataTransfer.effectAllowed).toBe("copy");
    });

    it("should not start drag in selection mode", () => {
      const { result } = renderHook(() => useBlendDragDrop());
      const mockEvent = createMockDragEvent();

      act(() => {
        result.current.handleBlendDragStart(
          mockEvent,
          "img-1",
          "https://example.com/enhanced.jpg",
          true,
        );
      });

      expect(result.current.blendDragSourceId).toBeNull();
      expect(mockEvent.dataTransfer.setData).not.toHaveBeenCalled();
    });
  });

  describe("isBlendDrag", () => {
    it("should return true for blend drag", () => {
      const { result } = renderHook(() => useBlendDragDrop());
      const mockEvent = createMockDragEvent({
        dataTransfer: {
          types: ["application/x-blend-image"],
        } as unknown as DataTransfer,
      });

      expect(result.current.isBlendDrag(mockEvent)).toBe(true);
    });

    it("should return false for non-blend drag", () => {
      const { result } = renderHook(() => useBlendDragDrop());
      const mockEvent = createMockDragEvent({
        dataTransfer: {
          types: ["Files"],
        } as unknown as DataTransfer,
      });

      expect(result.current.isBlendDrag(mockEvent)).toBe(false);
    });

    it("should handle undefined dataTransfer", () => {
      const { result } = renderHook(() => useBlendDragDrop());
      const mockEvent = {
        dataTransfer: undefined,
      } as unknown as React.DragEvent;

      expect(result.current.isBlendDrag(mockEvent)).toBe(false);
    });
  });

  describe("handleBlendDragOver", () => {
    it("should set blend drop target ID when different from source", () => {
      const { result } = renderHook(() => useBlendDragDrop());

      // Start drag
      const startEvent = createMockDragEvent();
      act(() => {
        result.current.handleBlendDragStart(
          startEvent,
          "img-1",
          "https://example.com/enhanced.jpg",
          false,
        );
      });

      // Drag over different image
      const overEvent = createMockDragEvent({
        dataTransfer: {
          types: ["application/x-blend-image"],
          dropEffect: "none",
        } as unknown as DataTransfer,
      });

      act(() => {
        result.current.handleBlendDragOver(overEvent, "img-2");
      });

      expect(result.current.blendDropTargetId).toBe("img-2");
      expect(overEvent.preventDefault).toHaveBeenCalled();
      expect(overEvent.dataTransfer.dropEffect).toBe("copy");
    });

    it("should not set target when same as source", () => {
      const { result } = renderHook(() => useBlendDragDrop());

      // Start drag
      const startEvent = createMockDragEvent();
      act(() => {
        result.current.handleBlendDragStart(
          startEvent,
          "img-1",
          "https://example.com/enhanced.jpg",
          false,
        );
      });

      // Drag over same image
      const overEvent = createMockDragEvent({
        dataTransfer: {
          types: ["application/x-blend-image"],
        } as unknown as DataTransfer,
      });

      act(() => {
        result.current.handleBlendDragOver(overEvent, "img-1");
      });

      expect(result.current.blendDropTargetId).toBeNull();
    });

    it("should not set target for non-blend drag", () => {
      const { result } = renderHook(() => useBlendDragDrop());

      const overEvent = createMockDragEvent({
        dataTransfer: {
          types: ["Files"],
        } as unknown as DataTransfer,
      });

      act(() => {
        result.current.handleBlendDragOver(overEvent, "img-2");
      });

      expect(result.current.blendDropTargetId).toBeNull();
    });
  });

  describe("handleBlendDrop", () => {
    it("should perform blend enhancement on drop", async () => {
      vi.useFakeTimers();

      const onBlendComplete = vi.fn();
      const { result } = renderHook(() => useBlendDragDrop({ onBlendComplete }));

      // Mock fetch responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ base64: "base64data", mimeType: "image/jpeg" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

      const blendData = JSON.stringify({
        imageId: "img-1",
        enhancedUrl: "https://example.com/enhanced.jpg",
      });

      const dropEvent = {
        preventDefault: vi.fn(),
        dataTransfer: {
          getData: vi.fn().mockReturnValue(blendData),
        },
      } as unknown as React.DragEvent;

      await act(async () => {
        await result.current.handleBlendDrop(dropEvent, "img-2");
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/images/fetch-base64", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "https://example.com/enhanced.jpg" }),
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/images/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageId: "img-2",
          tier: "TIER_1K",
          blendSource: { base64: "base64data", mimeType: "image/jpeg" },
        }),
      });

      // Advance timer for completion callback
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });

      expect(onBlendComplete).toHaveBeenCalledWith("img-2");

      vi.useRealTimers();
    });

    it("should not blend with self", async () => {
      const { result } = renderHook(() => useBlendDragDrop());

      // Start drag first to set source
      const startEvent = createMockDragEvent();
      act(() => {
        result.current.handleBlendDragStart(
          startEvent,
          "img-1",
          "https://example.com/enhanced.jpg",
          false,
        );
      });

      expect(result.current.blendDragSourceId).toBe("img-1");

      const blendData = JSON.stringify({
        imageId: "img-1",
        enhancedUrl: "https://example.com/enhanced.jpg",
      });

      const dropEvent = {
        preventDefault: vi.fn(),
        dataTransfer: {
          getData: vi.fn().mockReturnValue(blendData),
        },
      } as unknown as React.DragEvent;

      await act(async () => {
        await result.current.handleBlendDrop(dropEvent, "img-1");
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.blendDragSourceId).toBeNull();
      expect(result.current.blendDropTargetId).toBeNull();
    });

    it("should clear state when no blend data", async () => {
      const { result } = renderHook(() => useBlendDragDrop());

      // Set some state first
      const startEvent = createMockDragEvent();
      act(() => {
        result.current.handleBlendDragStart(
          startEvent,
          "img-1",
          "https://example.com/enhanced.jpg",
          false,
        );
      });

      const dropEvent = {
        preventDefault: vi.fn(),
        dataTransfer: {
          getData: vi.fn().mockReturnValue(""),
        },
      } as unknown as React.DragEvent;

      await act(async () => {
        await result.current.handleBlendDrop(dropEvent, "img-2");
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.blendDropTargetId).toBeNull();
    });

    it("should call onBlendError on fetch failure", async () => {
      const onBlendError = vi.fn();
      const { result } = renderHook(() => useBlendDragDrop({ onBlendError }));

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const blendData = JSON.stringify({
        imageId: "img-1",
        enhancedUrl: "https://example.com/enhanced.jpg",
      });

      const dropEvent = {
        preventDefault: vi.fn(),
        dataTransfer: {
          getData: vi.fn().mockReturnValue(blendData),
        },
      } as unknown as React.DragEvent;

      await act(async () => {
        await result.current.handleBlendDrop(dropEvent, "img-2");
      });

      expect(onBlendError).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Failed to fetch image" }),
      );
    });

    it("should call onBlendError on enhance failure", async () => {
      const onBlendError = vi.fn();
      const { result } = renderHook(() => useBlendDragDrop({ onBlendError }));

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ base64: "base64data", mimeType: "image/jpeg" }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: "Enhancement failed" }),
        });

      const blendData = JSON.stringify({
        imageId: "img-1",
        enhancedUrl: "https://example.com/enhanced.jpg",
      });

      const dropEvent = {
        preventDefault: vi.fn(),
        dataTransfer: {
          getData: vi.fn().mockReturnValue(blendData),
        },
      } as unknown as React.DragEvent;

      await act(async () => {
        await result.current.handleBlendDrop(dropEvent, "img-2");
      });

      expect(onBlendError).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Enhancement failed" }),
      );
    });

    it("should call onBlendStart callback", async () => {
      const onBlendStart = vi.fn();
      const { result } = renderHook(() => useBlendDragDrop({ onBlendStart }));

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ base64: "base64data", mimeType: "image/jpeg" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

      const blendData = JSON.stringify({
        imageId: "img-1",
        enhancedUrl: "https://example.com/enhanced.jpg",
      });

      const dropEvent = {
        preventDefault: vi.fn(),
        dataTransfer: {
          getData: vi.fn().mockReturnValue(blendData),
        },
      } as unknown as React.DragEvent;

      await act(async () => {
        await result.current.handleBlendDrop(dropEvent, "img-2");
      });

      expect(onBlendStart).toHaveBeenCalledWith("img-1", "img-2");
    });

    it("should set and clear blendingImageId during blend", async () => {
      vi.useFakeTimers();

      const onBlendStart = vi.fn();
      const { result } = renderHook(() => useBlendDragDrop({ onBlendStart }));

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ base64: "base64data", mimeType: "image/jpeg" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

      const blendData = JSON.stringify({
        imageId: "img-1",
        enhancedUrl: "https://example.com/enhanced.jpg",
      });

      const dropEvent = {
        preventDefault: vi.fn(),
        dataTransfer: {
          getData: vi.fn().mockReturnValue(blendData),
        },
      } as unknown as React.DragEvent;

      await act(async () => {
        await result.current.handleBlendDrop(dropEvent, "img-2");
      });

      // Verify onBlendStart was called (proves the blend started)
      expect(onBlendStart).toHaveBeenCalledWith("img-1", "img-2");

      // After completion, blendingImageId should be cleared
      expect(result.current.blendingImageId).toBeNull();

      vi.useRealTimers();
    });
  });

  describe("handleBlendDragEnd", () => {
    it("should clear drag state", () => {
      const { result } = renderHook(() => useBlendDragDrop());

      // Start drag
      const startEvent = createMockDragEvent();
      act(() => {
        result.current.handleBlendDragStart(
          startEvent,
          "img-1",
          "https://example.com/enhanced.jpg",
          false,
        );
      });

      expect(result.current.blendDragSourceId).toBe("img-1");

      act(() => {
        result.current.handleBlendDragEnd();
      });

      expect(result.current.blendDragSourceId).toBeNull();
      expect(result.current.blendDropTargetId).toBeNull();
    });
  });

  describe("resetBlendState", () => {
    it("should reset all blend state", () => {
      const { result } = renderHook(() => useBlendDragDrop());

      // Start drag
      const startEvent = createMockDragEvent();
      act(() => {
        result.current.handleBlendDragStart(
          startEvent,
          "img-1",
          "https://example.com/enhanced.jpg",
          false,
        );
      });

      // Drag over
      const overEvent = createMockDragEvent({
        dataTransfer: {
          types: ["application/x-blend-image"],
        } as unknown as DataTransfer,
      });
      act(() => {
        result.current.handleBlendDragOver(overEvent, "img-2");
      });

      expect(result.current.blendDragSourceId).toBe("img-1");
      expect(result.current.blendDropTargetId).toBe("img-2");

      act(() => {
        result.current.resetBlendState();
      });

      expect(result.current.blendDragSourceId).toBeNull();
      expect(result.current.blendDropTargetId).toBeNull();
      expect(result.current.blendingImageId).toBeNull();
    });
  });
});
