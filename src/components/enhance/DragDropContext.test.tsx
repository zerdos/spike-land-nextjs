import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DragDropProvider, useDragDrop } from "./DragDropContext";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Test component that uses the hook
function TestConsumer({
  onMount,
}: {
  onMount?: (ctx: ReturnType<typeof useDragDrop>) => void;
}) {
  const ctx = useDragDrop();

  // Call onMount callback on each render to expose context for testing
  if (onMount) {
    onMount(ctx);
  }

  return (
    <div data-testid="test-consumer">
      <span data-testid="is-dragging">{String(ctx.isDragging)}</span>
      <span data-testid="is-moving">{String(ctx.isMoving)}</span>
      <span data-testid="dragged-ids">{ctx.draggedImageIds.join(",")}</span>
      <span data-testid="drag-over-album">{ctx.dragOverAlbumId ?? "null"}</span>
      <button
        data-testid="start-drag"
        onClick={() => ctx.startDrag(["img-1", "img-2"])}
      >
        Start Drag
      </button>
      <button data-testid="end-drag" onClick={() => ctx.endDrag()}>
        End Drag
      </button>
      <button
        data-testid="set-drag-over"
        onClick={() => ctx.setDragOver("album-1")}
      >
        Set Drag Over
      </button>
      <button
        data-testid="clear-drag-over"
        onClick={() => ctx.setDragOver(null)}
      >
        Clear Drag Over
      </button>
      <button
        data-testid="handle-drop"
        onClick={() => ctx.handleDrop("album-1")}
      >
        Handle Drop
      </button>
    </div>
  );
}

describe("DragDropContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe("DragDropProvider", () => {
    it("renders children correctly", () => {
      render(
        <DragDropProvider>
          <div data-testid="child">Child Content</div>
        </DragDropProvider>,
      );

      expect(screen.getByTestId("child")).toBeInTheDocument();
      expect(screen.getByText("Child Content")).toBeInTheDocument();
    });

    it("provides initial state correctly", () => {
      render(
        <DragDropProvider>
          <TestConsumer />
        </DragDropProvider>,
      );

      expect(screen.getByTestId("is-dragging")).toHaveTextContent("false");
      expect(screen.getByTestId("is-moving")).toHaveTextContent("false");
      expect(screen.getByTestId("dragged-ids")).toHaveTextContent("");
      expect(screen.getByTestId("drag-over-album")).toHaveTextContent("null");
    });
  });

  describe("useDragDrop hook", () => {
    it("throws error when used outside of provider", () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        render(<TestConsumer />);
      }).toThrow("useDragDrop must be used within DragDropProvider");

      consoleSpy.mockRestore();
    });
  });

  describe("startDrag", () => {
    it("sets isDragging to true and stores image IDs", async () => {
      render(
        <DragDropProvider>
          <TestConsumer />
        </DragDropProvider>,
      );

      await act(async () => {
        screen.getByTestId("start-drag").click();
      });

      expect(screen.getByTestId("is-dragging")).toHaveTextContent("true");
      expect(screen.getByTestId("dragged-ids")).toHaveTextContent("img-1,img-2");
    });

    it("does not start drag when image IDs array is empty", async () => {
      let contextRef: ReturnType<typeof useDragDrop> | null = null;

      render(
        <DragDropProvider>
          <TestConsumer onMount={(ctx) => (contextRef = ctx)} />
        </DragDropProvider>,
      );

      await act(async () => {
        contextRef?.startDrag([]);
      });

      expect(screen.getByTestId("is-dragging")).toHaveTextContent("false");
      expect(screen.getByTestId("dragged-ids")).toHaveTextContent("");
    });

    it("resets dragOverAlbumId when starting a new drag", async () => {
      render(
        <DragDropProvider>
          <TestConsumer />
        </DragDropProvider>,
      );

      // Set drag over first
      await act(async () => {
        screen.getByTestId("set-drag-over").click();
      });

      expect(screen.getByTestId("drag-over-album")).toHaveTextContent("album-1");

      // Start new drag
      await act(async () => {
        screen.getByTestId("start-drag").click();
      });

      expect(screen.getByTestId("drag-over-album")).toHaveTextContent("null");
    });
  });

  describe("endDrag", () => {
    it("resets all drag state", async () => {
      render(
        <DragDropProvider>
          <TestConsumer />
        </DragDropProvider>,
      );

      // Start drag and set drag over
      await act(async () => {
        screen.getByTestId("start-drag").click();
      });
      await act(async () => {
        screen.getByTestId("set-drag-over").click();
      });

      expect(screen.getByTestId("is-dragging")).toHaveTextContent("true");
      expect(screen.getByTestId("drag-over-album")).toHaveTextContent("album-1");

      // End drag
      await act(async () => {
        screen.getByTestId("end-drag").click();
      });

      expect(screen.getByTestId("is-dragging")).toHaveTextContent("false");
      expect(screen.getByTestId("dragged-ids")).toHaveTextContent("");
      expect(screen.getByTestId("drag-over-album")).toHaveTextContent("null");
    });
  });

  describe("setDragOver", () => {
    it("sets the drag over album ID", async () => {
      render(
        <DragDropProvider>
          <TestConsumer />
        </DragDropProvider>,
      );

      await act(async () => {
        screen.getByTestId("set-drag-over").click();
      });

      expect(screen.getByTestId("drag-over-album")).toHaveTextContent("album-1");
    });

    it("clears the drag over album ID when set to null", async () => {
      render(
        <DragDropProvider>
          <TestConsumer />
        </DragDropProvider>,
      );

      await act(async () => {
        screen.getByTestId("set-drag-over").click();
      });

      expect(screen.getByTestId("drag-over-album")).toHaveTextContent("album-1");

      await act(async () => {
        screen.getByTestId("clear-drag-over").click();
      });

      expect(screen.getByTestId("drag-over-album")).toHaveTextContent("null");
    });
  });

  describe("handleDrop", () => {
    it("calls API to add images to album on drop", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, added: 2, results: [] }),
      });

      render(
        <DragDropProvider>
          <TestConsumer />
        </DragDropProvider>,
      );

      // Start drag first
      await act(async () => {
        screen.getByTestId("start-drag").click();
      });

      // Handle drop
      await act(async () => {
        screen.getByTestId("handle-drop").click();
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/albums/album-1/images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageIds: ["img-1", "img-2"] }),
        });
      });
    });

    it("sets isMoving to true during API call", async () => {
      let resolvePromise: () => void;
      mockFetch.mockImplementation(
        () =>
          new Promise<{ ok: boolean; json: () => Promise<unknown>; }>((resolve) => {
            resolvePromise = () =>
              resolve({
                ok: true,
                json: async () => ({ success: true, added: 2 }),
              });
          }),
      );

      render(
        <DragDropProvider>
          <TestConsumer />
        </DragDropProvider>,
      );

      // Start drag
      await act(async () => {
        screen.getByTestId("start-drag").click();
      });

      // Start drop (but don't await)
      act(() => {
        screen.getByTestId("handle-drop").click();
      });

      // isMoving should be true while request is in flight
      await waitFor(() => {
        expect(screen.getByTestId("is-moving")).toHaveTextContent("true");
      });

      // Resolve the promise
      await act(async () => {
        resolvePromise!();
      });

      // isMoving should be false after completion
      await waitFor(() => {
        expect(screen.getByTestId("is-moving")).toHaveTextContent("false");
      });
    });

    it("calls onMoveComplete callback on successful drop", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, added: 2, results: [] }),
      });

      const onMoveComplete = vi.fn();

      let contextRef: ReturnType<typeof useDragDrop> | null = null;

      render(
        <DragDropProvider onMoveComplete={onMoveComplete}>
          <TestConsumer onMount={(ctx) => (contextRef = ctx)} />
        </DragDropProvider>,
      );

      // Start drag with specific IDs
      await act(async () => {
        contextRef?.startDrag(["test-img-1", "test-img-2"]);
      });

      // Handle drop
      await act(async () => {
        await contextRef?.handleDrop("target-album");
      });

      expect(onMoveComplete).toHaveBeenCalledWith("target-album", [
        "test-img-1",
        "test-img-2",
      ]);
    });

    it("calls onMoveError callback when API returns error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: "Server error" }),
      });

      const onMoveError = vi.fn();

      render(
        <DragDropProvider onMoveError={onMoveError}>
          <TestConsumer />
        </DragDropProvider>,
      );

      // Start drag
      await act(async () => {
        screen.getByTestId("start-drag").click();
      });

      // Handle drop
      await act(async () => {
        screen.getByTestId("handle-drop").click();
      });

      await waitFor(() => {
        expect(onMoveError).toHaveBeenCalledWith(expect.any(Error));
        expect(onMoveError.mock.calls[0][0].message).toBe("Server error");
      });
    });

    it("calls onMoveError with generic message when json parsing fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error("Parse error");
        },
      });

      const onMoveError = vi.fn();

      render(
        <DragDropProvider onMoveError={onMoveError}>
          <TestConsumer />
        </DragDropProvider>,
      );

      // Start drag
      await act(async () => {
        screen.getByTestId("start-drag").click();
      });

      // Handle drop
      await act(async () => {
        screen.getByTestId("handle-drop").click();
      });

      await waitFor(() => {
        expect(onMoveError).toHaveBeenCalledWith(expect.any(Error));
        expect(onMoveError.mock.calls[0][0].message).toContain(
          "Failed to add images to album (500)",
        );
      });
    });

    it("resets drag state after drop", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, added: 2 }),
      });

      render(
        <DragDropProvider>
          <TestConsumer />
        </DragDropProvider>,
      );

      // Start drag
      await act(async () => {
        screen.getByTestId("start-drag").click();
      });

      expect(screen.getByTestId("is-dragging")).toHaveTextContent("true");

      // Handle drop
      await act(async () => {
        screen.getByTestId("handle-drop").click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("is-dragging")).toHaveTextContent("false");
        expect(screen.getByTestId("dragged-ids")).toHaveTextContent("");
      });
    });

    it("does nothing if no images are being dragged", async () => {
      render(
        <DragDropProvider>
          <TestConsumer />
        </DragDropProvider>,
      );

      // Try to drop without starting drag
      await act(async () => {
        screen.getByTestId("handle-drop").click();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("resets drag state even when API call fails", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const onMoveError = vi.fn();

      render(
        <DragDropProvider onMoveError={onMoveError}>
          <TestConsumer />
        </DragDropProvider>,
      );

      // Start drag
      await act(async () => {
        screen.getByTestId("start-drag").click();
      });

      // Handle drop
      await act(async () => {
        screen.getByTestId("handle-drop").click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("is-dragging")).toHaveTextContent("false");
        expect(screen.getByTestId("is-moving")).toHaveTextContent("false");
      });

      expect(onMoveError).toHaveBeenCalledWith(expect.any(Error));
    });

    it("handles non-Error objects in catch block", async () => {
      mockFetch.mockRejectedValueOnce("String error");

      const onMoveError = vi.fn();

      render(
        <DragDropProvider onMoveError={onMoveError}>
          <TestConsumer />
        </DragDropProvider>,
      );

      // Start drag
      await act(async () => {
        screen.getByTestId("start-drag").click();
      });

      // Handle drop
      await act(async () => {
        screen.getByTestId("handle-drop").click();
      });

      await waitFor(() => {
        expect(onMoveError).toHaveBeenCalledWith(expect.any(Error));
        expect(onMoveError.mock.calls[0][0].message).toBe(
          "Unknown error occurred",
        );
      });
    });

    it("still calls onMoveComplete when all images were duplicates", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, added: 0, results: [] }),
      });

      const onMoveComplete = vi.fn();

      render(
        <DragDropProvider onMoveComplete={onMoveComplete}>
          <TestConsumer />
        </DragDropProvider>,
      );

      // Start drag
      await act(async () => {
        screen.getByTestId("start-drag").click();
      });

      // Handle drop
      await act(async () => {
        screen.getByTestId("handle-drop").click();
      });

      await waitFor(() => {
        expect(onMoveComplete).toHaveBeenCalledWith("album-1", ["img-1", "img-2"]);
      });
    });
  });

  describe("multiple drag operations", () => {
    it("allows starting a new drag after previous drag ends", async () => {
      let contextRef: ReturnType<typeof useDragDrop> | null = null;

      render(
        <DragDropProvider>
          <TestConsumer onMount={(ctx) => (contextRef = ctx)} />
        </DragDropProvider>,
      );

      // First drag
      await act(async () => {
        contextRef?.startDrag(["img-1"]);
      });

      expect(screen.getByTestId("dragged-ids")).toHaveTextContent("img-1");

      // End first drag
      await act(async () => {
        contextRef?.endDrag();
      });

      // Second drag with different images
      await act(async () => {
        contextRef?.startDrag(["img-3", "img-4"]);
      });

      expect(screen.getByTestId("dragged-ids")).toHaveTextContent("img-3,img-4");
    });
  });
});
