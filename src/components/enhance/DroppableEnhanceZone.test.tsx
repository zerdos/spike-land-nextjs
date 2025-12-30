import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DroppableEnhanceZone } from "./DroppableEnhanceZone";

// Mock FileReader
class MockFileReader {
  result: string | null = null;
  error: Error | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readAsDataURL(_blob: Blob) {
    this.result = "data:image/png;base64,mockbase64data";
    if (this.onload) {
      this.onload();
    }
  }
}

// Mock window.alert
const mockAlert = vi.fn();
Object.defineProperty(window, "alert", {
  writable: true,
  value: mockAlert,
});

describe("DroppableEnhanceZone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-expect-error - Mocking FileReader global
    global.FileReader = MockFileReader;
  });

  afterEach(() => {
    // Clean up mocks if needed
  });

  it("renders children correctly", () => {
    render(
      <DroppableEnhanceZone onImageDrop={vi.fn()}>
        <div>Drop Zone Content</div>
      </DroppableEnhanceZone>,
    );
    expect(screen.getByText("Drop Zone Content")).toBeInTheDocument();
  });

  it("shows drop overlay on drag enter/over", () => {
    render(
      <DroppableEnhanceZone onImageDrop={vi.fn()}>
        <div>Content</div>
      </DroppableEnhanceZone>,
    );

    const dropZone = screen.getByText("Content").parentElement!;

    fireEvent.dragEnter(dropZone, {
      dataTransfer: { dropEffect: "" },
    });
    expect(screen.getByText("Drop to Blend Images")).toBeInTheDocument();

    fireEvent.dragLeave(dropZone, {
      dataTransfer: { dropEffect: "" },
    });
    expect(screen.queryByText("Drop to Blend Images")).not.toBeInTheDocument();
  });

  it("handles valid image drop", async () => {
    const onImageDrop = vi.fn();
    render(
      <DroppableEnhanceZone onImageDrop={onImageDrop}>
        <div>Content</div>
      </DroppableEnhanceZone>,
    );

    const file = new File(["dummy content"], "test.png", { type: "image/png" });
    const dropZone = screen.getByText("Content").parentElement!;

    // Trigger drop
    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
      },
    });

    await waitFor(() => {
      expect(onImageDrop).toHaveBeenCalledWith({
        base64: "mockbase64data",
        mimeType: "image/png",
        fileName: "test.png",
      });
    });
  });

  it("calls onAutoEnhance if provided", async () => {
    const onAutoEnhance = vi.fn();
    render(
      <DroppableEnhanceZone onImageDrop={vi.fn()} onAutoEnhance={onAutoEnhance}>
        <div>Content</div>
      </DroppableEnhanceZone>,
    );

    const file = new File(["dummy content"], "test.png", { type: "image/png" });
    const dropZone = screen.getByText("Content").parentElement!;

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
      },
    });

    await waitFor(() => {
      expect(onAutoEnhance).toHaveBeenCalled();
    });
  });

  it("rejects invalid file types", async () => {
    const onImageDrop = vi.fn();
    render(
      <DroppableEnhanceZone onImageDrop={onImageDrop}>
        <div>Content</div>
      </DroppableEnhanceZone>,
    );

    const file = new File(["dummy content"], "test.txt", {
      type: "text/plain",
    });
    const dropZone = screen.getByText("Content").parentElement!;

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
      },
    });

    // onImageDrop should NOT be called because the file filter happens inside handleDrop
    expect(onImageDrop).not.toHaveBeenCalled();
    expect(mockAlert).not.toHaveBeenCalled();
  });

  it("alerts on file size limit", async () => {
    const onImageDrop = vi.fn();
    render(
      <DroppableEnhanceZone onImageDrop={onImageDrop}>
        <div>Content</div>
      </DroppableEnhanceZone>,
    );

    const largeFile = new File([""], "large.png", { type: "image/png" });
    // Mock size property
    Object.defineProperty(largeFile, "size", { value: 21 * 1024 * 1024 });

    const dropZone = screen.getByText("Content").parentElement!;

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [largeFile],
      },
    });

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith(
        expect.stringContaining("too large"),
      );
    });
    expect(onImageDrop).not.toHaveBeenCalled();
  });

  it("does not trigger events when disabled", () => {
    const onImageDrop = vi.fn();
    render(
      <DroppableEnhanceZone onImageDrop={onImageDrop} disabled={true}>
        <div>Content</div>
      </DroppableEnhanceZone>,
    );

    const dropZone = screen.getByText("Content").parentElement!;

    fireEvent.dragEnter(dropZone, {
      dataTransfer: { dropEffect: "" },
    });
    expect(screen.queryByText("Drop to Blend Images")).not.toBeInTheDocument();

    const file = new File(["dummy"], "test.png", { type: "image/png" });
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    expect(onImageDrop).not.toHaveBeenCalled();
  });
});
