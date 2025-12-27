import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useFileDragDrop } from "./useFileDragDrop";

// Create mock drag event
const createMockDragEvent = (
  overrides: Partial<{
    dataTransfer: Partial<DataTransfer>;
  }> = {},
): React.DragEvent => ({
  preventDefault: vi.fn(),
  stopPropagation: vi.fn(),
  dataTransfer: {
    types: ["Files"],
    files: [],
    ...overrides.dataTransfer,
  } as unknown as DataTransfer,
  ...overrides,
} as unknown as React.DragEvent);

// Create mock file
const createMockFile = (name: string, type: string): File => {
  return new File(["content"], name, { type });
};

describe("useFileDragDrop", () => {
  describe("initialization", () => {
    it("should initialize with false dragging state", () => {
      const { result } = renderHook(() => useFileDragDrop());

      expect(result.current.isDraggingFiles).toBe(false);
      expect(result.current.fileInputRef.current).toBeNull();
    });

    it("should be enabled by default", () => {
      const onFileDrop = vi.fn();
      const { result } = renderHook(() => useFileDragDrop({ onFileDrop }));

      const mockEvent = createMockDragEvent();

      act(() => {
        result.current.handleDragEnter(mockEvent);
      });

      expect(result.current.isDraggingFiles).toBe(true);
    });
  });

  describe("handleDragEnter", () => {
    it("should set isDraggingFiles when entering with files", () => {
      const { result } = renderHook(() => useFileDragDrop());

      const mockEvent = createMockDragEvent({
        dataTransfer: {
          types: ["Files"],
        } as unknown as DataTransfer,
      });

      act(() => {
        result.current.handleDragEnter(mockEvent);
      });

      expect(result.current.isDraggingFiles).toBe(true);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    it("should not set isDraggingFiles for non-file drags", () => {
      const { result } = renderHook(() => useFileDragDrop());

      const mockEvent = createMockDragEvent({
        dataTransfer: {
          types: ["text/plain"],
        } as unknown as DataTransfer,
      });

      act(() => {
        result.current.handleDragEnter(mockEvent);
      });

      expect(result.current.isDraggingFiles).toBe(false);
    });

    it("should do nothing when disabled", () => {
      const { result } = renderHook(() => useFileDragDrop({ enabled: false }));

      const mockEvent = createMockDragEvent();

      act(() => {
        result.current.handleDragEnter(mockEvent);
      });

      expect(result.current.isDraggingFiles).toBe(false);
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe("handleDragLeave", () => {
    it("should clear isDraggingFiles when all elements left", () => {
      const { result } = renderHook(() => useFileDragDrop());

      const mockEvent = createMockDragEvent();

      // Enter twice (nested elements)
      act(() => {
        result.current.handleDragEnter(mockEvent);
        result.current.handleDragEnter(mockEvent);
      });

      expect(result.current.isDraggingFiles).toBe(true);

      // Leave once (still nested)
      act(() => {
        result.current.handleDragLeave(mockEvent);
      });

      expect(result.current.isDraggingFiles).toBe(true);

      // Leave again (all left)
      act(() => {
        result.current.handleDragLeave(mockEvent);
      });

      expect(result.current.isDraggingFiles).toBe(false);
    });

    it("should do nothing when disabled", () => {
      const { result } = renderHook(() => useFileDragDrop({ enabled: false }));

      // First manually set dragging to true to test the handler
      const enabledHook = renderHook(() => useFileDragDrop());
      const enabledEvent = createMockDragEvent();

      act(() => {
        enabledHook.result.current.handleDragEnter(enabledEvent);
      });

      expect(enabledHook.result.current.isDraggingFiles).toBe(true);

      // Now test disabled hook
      const mockEvent = createMockDragEvent();

      act(() => {
        result.current.handleDragLeave(mockEvent);
      });

      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe("handleDragOver", () => {
    it("should prevent default and stop propagation", () => {
      const { result } = renderHook(() => useFileDragDrop());

      const mockEvent = createMockDragEvent();

      act(() => {
        result.current.handleDragOver(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    it("should do nothing when disabled", () => {
      const { result } = renderHook(() => useFileDragDrop({ enabled: false }));

      const mockEvent = createMockDragEvent();

      act(() => {
        result.current.handleDragOver(mockEvent);
      });

      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe("handleDrop", () => {
    it("should call onFileDrop with image files", () => {
      const onFileDrop = vi.fn();
      const { result } = renderHook(() => useFileDragDrop({ onFileDrop }));

      const mockFiles = [
        createMockFile("image1.jpg", "image/jpeg"),
        createMockFile("image2.png", "image/png"),
      ];

      const mockEvent = createMockDragEvent({
        dataTransfer: {
          types: ["Files"],
          files: mockFiles,
        } as unknown as DataTransfer,
      });

      act(() => {
        result.current.handleDrop(mockEvent);
      });

      expect(onFileDrop).toHaveBeenCalledWith(mockFiles);
      expect(result.current.isDraggingFiles).toBe(false);
    });

    it("should filter out non-image files", () => {
      const onFileDrop = vi.fn();
      const { result } = renderHook(() => useFileDragDrop({ onFileDrop }));

      const mockFiles = [
        createMockFile("image.jpg", "image/jpeg"),
        createMockFile("document.pdf", "application/pdf"),
        createMockFile("text.txt", "text/plain"),
      ];

      const mockEvent = createMockDragEvent({
        dataTransfer: {
          types: ["Files"],
          files: mockFiles,
        } as unknown as DataTransfer,
      });

      act(() => {
        result.current.handleDrop(mockEvent);
      });

      expect(onFileDrop).toHaveBeenCalledWith([mockFiles[0]]);
    });

    it("should not call onFileDrop when no image files", () => {
      const onFileDrop = vi.fn();
      const { result } = renderHook(() => useFileDragDrop({ onFileDrop }));

      const mockFiles = [createMockFile("document.pdf", "application/pdf")];

      const mockEvent = createMockDragEvent({
        dataTransfer: {
          types: ["Files"],
          files: mockFiles,
        } as unknown as DataTransfer,
      });

      act(() => {
        result.current.handleDrop(mockEvent);
      });

      expect(onFileDrop).not.toHaveBeenCalled();
    });

    it("should handle missing dataTransfer.files", () => {
      const onFileDrop = vi.fn();
      const { result } = renderHook(() => useFileDragDrop({ onFileDrop }));

      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: undefined,
      } as unknown as React.DragEvent;

      act(() => {
        result.current.handleDrop(mockEvent);
      });

      expect(onFileDrop).not.toHaveBeenCalled();
    });

    it("should do nothing when disabled", () => {
      const onFileDrop = vi.fn();
      const { result } = renderHook(() => useFileDragDrop({ enabled: false, onFileDrop }));

      const mockFiles = [createMockFile("image.jpg", "image/jpeg")];

      const mockEvent = createMockDragEvent({
        dataTransfer: {
          types: ["Files"],
          files: mockFiles,
        } as unknown as DataTransfer,
      });

      act(() => {
        result.current.handleDrop(mockEvent);
      });

      expect(onFileDrop).not.toHaveBeenCalled();
    });

    it("should reset drag counter on drop", () => {
      const { result } = renderHook(() => useFileDragDrop());

      const enterEvent = createMockDragEvent();

      // Enter multiple times
      act(() => {
        result.current.handleDragEnter(enterEvent);
        result.current.handleDragEnter(enterEvent);
      });

      expect(result.current.isDraggingFiles).toBe(true);

      // Drop should reset everything
      const dropEvent = createMockDragEvent();

      act(() => {
        result.current.handleDrop(dropEvent);
      });

      expect(result.current.isDraggingFiles).toBe(false);
    });
  });

  describe("handleUploadClick", () => {
    it("should trigger file input click", () => {
      const { result } = renderHook(() => useFileDragDrop());

      // Create a mock input element
      const mockInput = {
        click: vi.fn(),
      };

      // Manually set the ref
      Object.defineProperty(result.current.fileInputRef, "current", {
        value: mockInput,
        writable: true,
      });

      act(() => {
        result.current.handleUploadClick();
      });

      expect(mockInput.click).toHaveBeenCalled();
    });

    it("should handle null ref gracefully", () => {
      const { result } = renderHook(() => useFileDragDrop());

      // Should not throw
      expect(() => {
        act(() => {
          result.current.handleUploadClick();
        });
      }).not.toThrow();
    });
  });

  describe("handleFileInputChange", () => {
    it("should call onFileDrop with selected files", () => {
      const onFileDrop = vi.fn();
      const { result } = renderHook(() => useFileDragDrop({ onFileDrop }));

      const mockFiles = [createMockFile("image.jpg", "image/jpeg")];

      const mockEvent = {
        target: {
          files: mockFiles,
          value: "C:\\fakepath\\image.jpg",
        },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleFileInputChange(mockEvent);
      });

      expect(onFileDrop).toHaveBeenCalledWith(mockFiles);
      expect(mockEvent.target.value).toBe("");
    });

    it("should handle empty file selection", () => {
      const onFileDrop = vi.fn();
      const { result } = renderHook(() => useFileDragDrop({ onFileDrop }));

      const mockEvent = {
        target: {
          files: null,
          value: "",
        },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleFileInputChange(mockEvent);
      });

      expect(onFileDrop).not.toHaveBeenCalled();
    });

    it("should reset input value after selection", () => {
      const onFileDrop = vi.fn();
      const { result } = renderHook(() => useFileDragDrop({ onFileDrop }));

      const mockEvent = {
        target: {
          files: [createMockFile("image.jpg", "image/jpeg")],
          value: "C:\\fakepath\\image.jpg",
        },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleFileInputChange(mockEvent);
      });

      expect(mockEvent.target.value).toBe("");
    });
  });

  describe("resetDragState", () => {
    it("should reset drag state", () => {
      const { result } = renderHook(() => useFileDragDrop());

      // Enter to set dragging state
      const mockEvent = createMockDragEvent();
      act(() => {
        result.current.handleDragEnter(mockEvent);
      });

      expect(result.current.isDraggingFiles).toBe(true);

      act(() => {
        result.current.resetDragState();
      });

      expect(result.current.isDraggingFiles).toBe(false);
    });
  });
});
