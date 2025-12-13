import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DroppableAlbum } from "./DroppableAlbum";

describe("DroppableAlbum Component", () => {
  const defaultProps = {
    albumId: "album-1",
    children: <div data-testid="child-content">Album Content</div>,
  };

  it("should render children correctly", () => {
    render(<DroppableAlbum {...defaultProps} />);

    expect(screen.getByTestId("child-content")).toBeInTheDocument();
    expect(screen.getByText("Album Content")).toBeInTheDocument();
  });

  it("should render with correct testid", () => {
    render(<DroppableAlbum {...defaultProps} />);

    expect(screen.getByTestId("droppable-album-album-1")).toBeInTheDocument();
  });

  it("should set data-drag-over attribute based on isDragOver prop", () => {
    const { rerender } = render(<DroppableAlbum {...defaultProps} isDragOver={false} />);

    const element = screen.getByTestId("droppable-album-album-1");
    expect(element).toHaveAttribute("data-drag-over", "false");

    rerender(<DroppableAlbum {...defaultProps} isDragOver={true} />);
    expect(element).toHaveAttribute("data-drag-over", "true");
  });

  it("should apply highlight styles when isDragOver is true", () => {
    render(<DroppableAlbum {...defaultProps} isDragOver={true} />);

    const element = screen.getByTestId("droppable-album-album-1");
    expect(element.className).toContain("ring-2");
    expect(element.className).toContain("ring-primary");
    expect(element.className).toContain("scale-[1.02]");
  });

  it("should not apply highlight styles when isDragOver is false", () => {
    render(<DroppableAlbum {...defaultProps} isDragOver={false} />);

    const element = screen.getByTestId("droppable-album-album-1");
    expect(element.className).not.toContain("ring-2");
    expect(element.className).not.toContain("ring-primary");
    expect(element.className).not.toContain("scale-[1.02]");
  });

  it("should always have transition classes", () => {
    render(<DroppableAlbum {...defaultProps} />);

    const element = screen.getByTestId("droppable-album-album-1");
    expect(element.className).toContain("transition-all");
    expect(element.className).toContain("duration-200");
  });

  describe("drag events", () => {
    it("should call onDragOver when dragging over", () => {
      const onDragOver = vi.fn();
      render(<DroppableAlbum {...defaultProps} onDragOver={onDragOver} />);

      const element = screen.getByTestId("droppable-album-album-1");
      fireEvent.dragOver(element);

      expect(onDragOver).toHaveBeenCalled();
    });

    it("should update internal drag state on dragOver", () => {
      render(<DroppableAlbum {...defaultProps} />);

      const element = screen.getByTestId("droppable-album-album-1");
      expect(element).toHaveAttribute("data-drag-over", "false");

      fireEvent.dragOver(element);
      expect(element).toHaveAttribute("data-drag-over", "true");
    });

    it("should call onDragOver when dragEnter fires", () => {
      const onDragOver = vi.fn();
      render(<DroppableAlbum {...defaultProps} onDragOver={onDragOver} />);

      const element = screen.getByTestId("droppable-album-album-1");
      fireEvent.dragEnter(element);

      expect(onDragOver).toHaveBeenCalled();
    });

    it("should call onDragLeave when leaving the drop zone", () => {
      const onDragLeave = vi.fn();
      render(<DroppableAlbum {...defaultProps} onDragLeave={onDragLeave} />);

      const element = screen.getByTestId("droppable-album-album-1");
      fireEvent.dragOver(element);

      fireEvent.dragLeave(element, {
        relatedTarget: document.body,
      });

      expect(onDragLeave).toHaveBeenCalled();
    });

    it("should not call onDragLeave when relatedTarget is inside the drop zone", () => {
      const onDragLeave = vi.fn();
      render(<DroppableAlbum {...defaultProps} onDragLeave={onDragLeave} />);

      const element = screen.getByTestId("droppable-album-album-1");
      const childElement = screen.getByTestId("child-content");

      fireEvent.dragOver(element);

      // When dragging within the same element hierarchy
      const customEvent = new Event("dragleave", { bubbles: true });
      Object.defineProperty(customEvent, "relatedTarget", { value: childElement });
      element.dispatchEvent(customEvent);

      expect(onDragLeave).not.toHaveBeenCalled();
    });

    it("should not call onDragOver multiple times during continuous dragOver", () => {
      const onDragOver = vi.fn();
      render(<DroppableAlbum {...defaultProps} onDragOver={onDragOver} />);

      const element = screen.getByTestId("droppable-album-album-1");

      fireEvent.dragOver(element);
      fireEvent.dragOver(element);
      fireEvent.dragOver(element);

      expect(onDragOver).toHaveBeenCalledTimes(1);
    });
  });

  describe("drop handling", () => {
    it("should call onDrop with imageIds when valid data is dropped", () => {
      const onDrop = vi.fn();
      render(<DroppableAlbum {...defaultProps} onDrop={onDrop} />);

      const element = screen.getByTestId("droppable-album-album-1");

      const dropEvent = new Event("drop", { bubbles: true }) as unknown as DragEvent;
      Object.defineProperty(dropEvent, "dataTransfer", {
        value: {
          getData: vi.fn().mockReturnValue(JSON.stringify({ imageIds: ["img-1", "img-2"] })),
        },
      });
      element.dispatchEvent(dropEvent);

      expect(onDrop).toHaveBeenCalledWith(["img-1", "img-2"]);
    });

    it("should not call onDrop when no data is provided", () => {
      const onDrop = vi.fn();
      render(<DroppableAlbum {...defaultProps} onDrop={onDrop} />);

      const element = screen.getByTestId("droppable-album-album-1");

      const dropEvent = new Event("drop", { bubbles: true }) as unknown as DragEvent;
      Object.defineProperty(dropEvent, "dataTransfer", {
        value: {
          getData: vi.fn().mockReturnValue(""),
        },
      });
      element.dispatchEvent(dropEvent);

      expect(onDrop).not.toHaveBeenCalled();
    });

    it("should not call onDrop when invalid JSON is dropped", () => {
      const onDrop = vi.fn();
      render(<DroppableAlbum {...defaultProps} onDrop={onDrop} />);

      const element = screen.getByTestId("droppable-album-album-1");

      const dropEvent = new Event("drop", { bubbles: true }) as unknown as DragEvent;
      Object.defineProperty(dropEvent, "dataTransfer", {
        value: {
          getData: vi.fn().mockReturnValue("invalid json"),
        },
      });
      element.dispatchEvent(dropEvent);

      expect(onDrop).not.toHaveBeenCalled();
    });

    it("should not call onDrop when data does not have imageIds array", () => {
      const onDrop = vi.fn();
      render(<DroppableAlbum {...defaultProps} onDrop={onDrop} />);

      const element = screen.getByTestId("droppable-album-album-1");

      const dropEvent = new Event("drop", { bubbles: true }) as unknown as DragEvent;
      Object.defineProperty(dropEvent, "dataTransfer", {
        value: {
          getData: vi.fn().mockReturnValue(JSON.stringify({ otherData: "value" })),
        },
      });
      element.dispatchEvent(dropEvent);

      expect(onDrop).not.toHaveBeenCalled();
    });

    it("should not call onDrop when imageIds is not an array", () => {
      const onDrop = vi.fn();
      render(<DroppableAlbum {...defaultProps} onDrop={onDrop} />);

      const element = screen.getByTestId("droppable-album-album-1");

      const dropEvent = new Event("drop", { bubbles: true }) as unknown as DragEvent;
      Object.defineProperty(dropEvent, "dataTransfer", {
        value: {
          getData: vi.fn().mockReturnValue(JSON.stringify({ imageIds: "not-an-array" })),
        },
      });
      element.dispatchEvent(dropEvent);

      expect(onDrop).not.toHaveBeenCalled();
    });

    it("should reset drag over state after drop", async () => {
      const onDrop = vi.fn();
      render(<DroppableAlbum {...defaultProps} onDrop={onDrop} />);

      const element = screen.getByTestId("droppable-album-album-1");

      fireEvent.dragOver(element);
      expect(element).toHaveAttribute("data-drag-over", "true");

      await act(async () => {
        const dropEvent = new Event("drop", { bubbles: true }) as unknown as DragEvent;
        Object.defineProperty(dropEvent, "dataTransfer", {
          value: {
            getData: vi.fn().mockReturnValue(JSON.stringify({ imageIds: ["img-1"] })),
          },
        });
        element.dispatchEvent(dropEvent);
      });

      expect(element).toHaveAttribute("data-drag-over", "false");
    });
  });

  describe("internal drag state management", () => {
    it("should manage internal drag over state when no external isDragOver prop", () => {
      render(<DroppableAlbum {...defaultProps} />);

      const element = screen.getByTestId("droppable-album-album-1");
      expect(element).toHaveAttribute("data-drag-over", "false");

      fireEvent.dragOver(element);
      expect(element).toHaveAttribute("data-drag-over", "true");

      fireEvent.dragLeave(element, {
        relatedTarget: document.body,
      });
      expect(element).toHaveAttribute("data-drag-over", "false");
    });

    it("should use external isDragOver prop when provided", () => {
      const { rerender } = render(<DroppableAlbum {...defaultProps} isDragOver={true} />);

      const element = screen.getByTestId("droppable-album-album-1");
      expect(element).toHaveAttribute("data-drag-over", "true");
      expect(element.className).toContain("ring-2");

      rerender(<DroppableAlbum {...defaultProps} isDragOver={false} />);
      expect(element).toHaveAttribute("data-drag-over", "false");
      expect(element.className).not.toContain("ring-2");
    });
  });

  describe("works without optional callbacks", () => {
    it("should handle dragOver without onDragOver callback", () => {
      render(<DroppableAlbum {...defaultProps} />);

      const element = screen.getByTestId("droppable-album-album-1");
      expect(() => {
        fireEvent.dragOver(element);
      }).not.toThrow();
    });

    it("should handle dragLeave without onDragLeave callback", () => {
      render(<DroppableAlbum {...defaultProps} />);

      const element = screen.getByTestId("droppable-album-album-1");
      expect(() => {
        fireEvent.dragLeave(element, {
          relatedTarget: document.body,
        });
      }).not.toThrow();
    });

    it("should handle drop without onDrop callback", () => {
      render(<DroppableAlbum {...defaultProps} />);

      const element = screen.getByTestId("droppable-album-album-1");
      expect(() => {
        const dropEvent = new Event("drop", { bubbles: true }) as unknown as DragEvent;
        Object.defineProperty(dropEvent, "dataTransfer", {
          value: {
            getData: vi.fn().mockReturnValue(JSON.stringify({ imageIds: ["img-1"] })),
          },
        });
        element.dispatchEvent(dropEvent);
      }).not.toThrow();
    });
  });

  describe("different album IDs", () => {
    it("should render with different album IDs in testid", () => {
      const { rerender } = render(<DroppableAlbum albumId="album-123">{null}</DroppableAlbum>);

      expect(screen.getByTestId("droppable-album-album-123")).toBeInTheDocument();

      rerender(<DroppableAlbum albumId="special-album">{null}</DroppableAlbum>);
      expect(screen.getByTestId("droppable-album-special-album")).toBeInTheDocument();
    });
  });

  describe("edge cases for drag events", () => {
    it("should handle dragLeave when relatedTarget is null", () => {
      const onDragLeave = vi.fn();
      render(<DroppableAlbum {...defaultProps} onDragLeave={onDragLeave} />);

      const element = screen.getByTestId("droppable-album-album-1");
      fireEvent.dragOver(element);

      // Simulate dragLeave with null relatedTarget
      fireEvent.dragLeave(element, {
        relatedTarget: null,
      });

      expect(onDragLeave).toHaveBeenCalled();
    });

    it("should not call onDrop when dataTransfer is null", async () => {
      const onDrop = vi.fn();
      render(<DroppableAlbum {...defaultProps} onDrop={onDrop} />);

      const element = screen.getByTestId("droppable-album-album-1");

      await act(async () => {
        const dropEvent = new Event("drop", { bubbles: true }) as unknown as DragEvent;
        // dataTransfer is not defined, so it will be undefined/null
        element.dispatchEvent(dropEvent);
      });

      expect(onDrop).not.toHaveBeenCalled();
    });

    it("should set dropEffect on dragEnter when dataTransfer exists", () => {
      const onDragOver = vi.fn();
      render(<DroppableAlbum {...defaultProps} onDragOver={onDragOver} />);

      const element = screen.getByTestId("droppable-album-album-1");

      const dragEnterEvent = new Event("dragenter", { bubbles: true }) as unknown as DragEvent;
      const mockDataTransfer = { dropEffect: "" };
      Object.defineProperty(dragEnterEvent, "dataTransfer", {
        value: mockDataTransfer,
      });
      element.dispatchEvent(dragEnterEvent);

      expect(mockDataTransfer.dropEffect).toBe("move");
    });

    it("should set dropEffect on dragOver when dataTransfer exists", () => {
      render(<DroppableAlbum {...defaultProps} />);

      const element = screen.getByTestId("droppable-album-album-1");

      const dragOverEvent = new Event("dragover", { bubbles: true }) as unknown as DragEvent;
      const mockDataTransfer = { dropEffect: "" };
      Object.defineProperty(dragOverEvent, "dataTransfer", {
        value: mockDataTransfer,
      });
      element.dispatchEvent(dragOverEvent);

      expect(mockDataTransfer.dropEffect).toBe("move");
    });

    it("should handle dragEnter without dataTransfer", () => {
      const onDragOver = vi.fn();
      render(<DroppableAlbum {...defaultProps} onDragOver={onDragOver} />);

      const element = screen.getByTestId("droppable-album-album-1");

      const dragEnterEvent = new Event("dragenter", { bubbles: true }) as unknown as DragEvent;
      // No dataTransfer property defined
      element.dispatchEvent(dragEnterEvent);

      expect(onDragOver).toHaveBeenCalled();
    });

    it("should handle dragOver without dataTransfer", () => {
      const onDragOver = vi.fn();
      render(<DroppableAlbum {...defaultProps} onDragOver={onDragOver} />);

      const element = screen.getByTestId("droppable-album-album-1");

      // First reset state
      fireEvent.dragLeave(element, { relatedTarget: document.body });

      const dragOverEvent = new Event("dragover", { bubbles: true }) as unknown as DragEvent;
      // No dataTransfer property defined
      element.dispatchEvent(dragOverEvent);

      expect(onDragOver).toHaveBeenCalled();
    });

    it("should not call onDragOver again during dragEnter if already dragging over", () => {
      const onDragOver = vi.fn();
      render(<DroppableAlbum {...defaultProps} onDragOver={onDragOver} />);

      const element = screen.getByTestId("droppable-album-album-1");

      // First dragEnter sets the state
      fireEvent.dragEnter(element);
      expect(onDragOver).toHaveBeenCalledTimes(1);

      // Second dragEnter should not call onDragOver again
      fireEvent.dragEnter(element);
      expect(onDragOver).toHaveBeenCalledTimes(1);
    });

    it("should handle drop with null data value from isDragData check", () => {
      const onDrop = vi.fn();
      render(<DroppableAlbum {...defaultProps} onDrop={onDrop} />);

      const element = screen.getByTestId("droppable-album-album-1");

      const dropEvent = new Event("drop", { bubbles: true }) as unknown as DragEvent;
      Object.defineProperty(dropEvent, "dataTransfer", {
        value: {
          getData: vi.fn().mockReturnValue(JSON.stringify(null)),
        },
      });
      element.dispatchEvent(dropEvent);

      expect(onDrop).not.toHaveBeenCalled();
    });

    it("should handle drop with primitive data value from isDragData check", () => {
      const onDrop = vi.fn();
      render(<DroppableAlbum {...defaultProps} onDrop={onDrop} />);

      const element = screen.getByTestId("droppable-album-album-1");

      const dropEvent = new Event("drop", { bubbles: true }) as unknown as DragEvent;
      Object.defineProperty(dropEvent, "dataTransfer", {
        value: {
          getData: vi.fn().mockReturnValue(JSON.stringify("string-value")),
        },
      });
      element.dispatchEvent(dropEvent);

      expect(onDrop).not.toHaveBeenCalled();
    });
  });
});
