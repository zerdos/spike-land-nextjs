import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useComposerImages } from "./useComposerImages";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock URL.createObjectURL and URL.revokeObjectURL
let objectUrlCounter = 0;
const createdObjectUrls: string[] = [];
const revokedObjectUrls: string[] = [];

vi.stubGlobal("URL", {
  ...globalThis.URL,
  createObjectURL: vi.fn((blob: Blob) => {
    const url = `blob:http://localhost/${objectUrlCounter++}-${blob instanceof File ? (blob as File).name : "blob"}`;
    createdObjectUrls.push(url);
    return url;
  }),
  revokeObjectURL: vi.fn((url: string) => {
    revokedObjectUrls.push(url);
  }),
});

function createMockFile(
  name: string,
  type: string = "image/jpeg",
  size: number = 1024,
): File {
  const file = new File(["content"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

function createFileList(files: File[]): FileList {
  const fileList = {
    length: files.length,
    item: (index: number) => files[index] ?? null,
    [Symbol.iterator]: function* () {
      for (const file of files) {
        yield file;
      }
    },
  } as unknown as FileList;
  files.forEach((file, index) => {
    Object.defineProperty(fileList, index, { value: file, enumerable: true });
  });
  return fileList;
}

describe("useComposerImages", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    objectUrlCounter = 0;
    createdObjectUrls.length = 0;
    revokedObjectUrls.length = 0;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Initial State", () => {
    it("should initialize with empty images array", () => {
      const { result } = renderHook(() => useComposerImages());

      expect(result.current.images).toEqual([]);
      expect(result.current.isDragging).toBe(false);
      expect(result.current.uploadedUrls).toEqual([]);
    });

    it("should accept custom options", () => {
      const { result } = renderHook(() =>
        useComposerImages({
          maxImages: 8,
          maxSizeBytes: 5 * 1024 * 1024,
          uploadEndpoint: "/api/custom-upload",
        }),
      );

      expect(result.current.images).toEqual([]);
    });
  });

  describe("addImages", () => {
    it("should add valid image files and generate preview URLs", () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ url: "https://r2.example.com/img.jpg" }),
      });

      const { result } = renderHook(() => useComposerImages());

      const files = [
        createMockFile("photo1.jpg"),
        createMockFile("photo2.png", "image/png"),
      ];

      act(() => {
        result.current.addImages(files);
      });

      expect(result.current.images).toHaveLength(2);
      expect(result.current.images[0]?.previewUrl).toContain("blob:");
      expect(result.current.images[1]?.previewUrl).toContain("blob:");
      expect(result.current.images[0]?.isUploading).toBe(true);
      expect(result.current.images[1]?.isUploading).toBe(true);
      expect(createdObjectUrls).toHaveLength(2);
    });

    it("should reject non-image files", () => {
      const { result } = renderHook(() => useComposerImages());

      const files = [
        createMockFile("doc.pdf", "application/pdf"),
        createMockFile("text.txt", "text/plain"),
      ];

      act(() => {
        result.current.addImages(files);
      });

      expect(result.current.images).toHaveLength(0);
    });

    it("should reject files over maxSizeBytes", () => {
      const { result } = renderHook(() =>
        useComposerImages({ maxSizeBytes: 1024 }),
      );

      const files = [createMockFile("large.jpg", "image/jpeg", 2048)];

      act(() => {
        result.current.addImages(files);
      });

      expect(result.current.images).toHaveLength(0);
    });

    it("should respect maxImages limit", () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ url: "https://r2.example.com/img.jpg" }),
      });

      const { result } = renderHook(() => useComposerImages({ maxImages: 2 }));

      const files = [
        createMockFile("a.jpg"),
        createMockFile("b.jpg"),
        createMockFile("c.jpg"),
      ];

      act(() => {
        result.current.addImages(files);
      });

      expect(result.current.images).toHaveLength(2);
    });

    it("should not add more images when already at max", () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ url: "https://r2.example.com/img.jpg" }),
      });

      const { result } = renderHook(() => useComposerImages({ maxImages: 2 }));

      act(() => {
        result.current.addImages([
          createMockFile("a.jpg"),
          createMockFile("b.jpg"),
        ]);
      });

      expect(result.current.images).toHaveLength(2);

      act(() => {
        result.current.addImages([createMockFile("c.jpg")]);
      });

      // Still 2 — no new images added
      expect(result.current.images).toHaveLength(2);
    });

    it("should accept FileList input", () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ url: "https://r2.example.com/img.jpg" }),
      });

      const { result } = renderHook(() => useComposerImages());
      const fileList = createFileList([createMockFile("photo.jpg")]);

      act(() => {
        result.current.addImages(fileList);
      });

      expect(result.current.images).toHaveLength(1);
    });

    it("should start uploading added images", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ url: "https://r2.example.com/uploaded.jpg" }),
      });

      const { result } = renderHook(() => useComposerImages());

      act(() => {
        result.current.addImages([createMockFile("photo.jpg")]);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("/api/create/upload-image");
      expect(options.method).toBe("POST");
      expect(options.body).toBeInstanceOf(FormData);
    });

    it("should use custom upload endpoint", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ url: "https://r2.example.com/uploaded.jpg" }),
      });

      const { result } = renderHook(() =>
        useComposerImages({ uploadEndpoint: "/api/custom" }),
      );

      act(() => {
        result.current.addImages([createMockFile("photo.jpg")]);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/custom",
          expect.anything(),
        );
      });
    });
  });

  describe("Upload lifecycle", () => {
    it("should mark image as uploaded with URL on success", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ url: "https://r2.example.com/uploaded.jpg" }),
      });

      const { result } = renderHook(() => useComposerImages());

      act(() => {
        result.current.addImages([createMockFile("photo.jpg")]);
      });

      await waitFor(() => {
        expect(result.current.images[0]?.isUploading).toBe(false);
        expect(result.current.images[0]?.uploadedUrl).toBe(
          "https://r2.example.com/uploaded.jpg",
        );
      });
    });

    it("should set error on upload failure (non-ok response)", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: "File too large" }),
      });

      const { result } = renderHook(() => useComposerImages());

      act(() => {
        result.current.addImages([createMockFile("photo.jpg")]);
      });

      await waitFor(() => {
        expect(result.current.images[0]?.isUploading).toBe(false);
        expect(result.current.images[0]?.error).toBe("File too large");
      });
    });

    it("should set default error when response JSON fails to parse", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.reject(new Error("Invalid JSON")),
      });

      const { result } = renderHook(() => useComposerImages());

      act(() => {
        result.current.addImages([createMockFile("photo.jpg")]);
      });

      await waitFor(() => {
        expect(result.current.images[0]?.isUploading).toBe(false);
        expect(result.current.images[0]?.error).toBe("Upload failed");
      });
    });

    it("should set error on network failure", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useComposerImages());

      act(() => {
        result.current.addImages([createMockFile("photo.jpg")]);
      });

      await waitFor(() => {
        expect(result.current.images[0]?.isUploading).toBe(false);
        expect(result.current.images[0]?.error).toBe("Network error");
      });
    });

    it("should handle non-Error thrown values", async () => {
      mockFetch.mockRejectedValue("string error");

      const { result } = renderHook(() => useComposerImages());

      act(() => {
        result.current.addImages([createMockFile("photo.jpg")]);
      });

      await waitFor(() => {
        expect(result.current.images[0]?.isUploading).toBe(false);
        expect(result.current.images[0]?.error).toBe("Upload failed");
      });
    });
  });

  describe("removeImage", () => {
    it("should remove image by id and revoke objectURL", () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ url: "https://r2.example.com/img.jpg" }),
      });

      const { result } = renderHook(() => useComposerImages());

      act(() => {
        result.current.addImages([createMockFile("photo.jpg")]);
      });

      const imageId = result.current.images[0]!.id;
      const previewUrl = result.current.images[0]!.previewUrl;

      act(() => {
        result.current.removeImage(imageId);
      });

      expect(result.current.images).toHaveLength(0);
      expect(revokedObjectUrls).toContain(previewUrl);
    });

    it("should only remove the specified image", () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ url: "https://r2.example.com/img.jpg" }),
      });

      const { result } = renderHook(() => useComposerImages());

      act(() => {
        result.current.addImages([
          createMockFile("a.jpg"),
          createMockFile("b.jpg"),
        ]);
      });

      const firstId = result.current.images[0]!.id;

      act(() => {
        result.current.removeImage(firstId);
      });

      expect(result.current.images).toHaveLength(1);
      expect(result.current.images[0]!.id).not.toBe(firstId);
    });
  });

  describe("clearAll", () => {
    it("should remove all images and revoke all objectURLs", () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ url: "https://r2.example.com/img.jpg" }),
      });

      const { result } = renderHook(() => useComposerImages());

      act(() => {
        result.current.addImages([
          createMockFile("a.jpg"),
          createMockFile("b.jpg"),
          createMockFile("c.jpg"),
        ]);
      });

      expect(result.current.images).toHaveLength(3);
      const urls = result.current.images.map((img) => img.previewUrl);

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.images).toHaveLength(0);
      urls.forEach((url) => {
        expect(revokedObjectUrls).toContain(url);
      });
    });
  });

  describe("dragHandlers", () => {
    function createDragEvent(files: File[] = []): React.DragEvent {
      return {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: {
          files: createFileList(files),
        },
      } as unknown as React.DragEvent;
    }

    it("onDragOver should set isDragging to true", () => {
      const { result } = renderHook(() => useComposerImages());

      act(() => {
        result.current.dragHandlers.onDragOver(createDragEvent());
      });

      expect(result.current.isDragging).toBe(true);
    });

    it("onDragOver should call preventDefault and stopPropagation", () => {
      const { result } = renderHook(() => useComposerImages());
      const event = createDragEvent();

      act(() => {
        result.current.dragHandlers.onDragOver(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
    });

    it("onDragLeave should set isDragging to false", () => {
      const { result } = renderHook(() => useComposerImages());

      act(() => {
        result.current.dragHandlers.onDragOver(createDragEvent());
      });

      expect(result.current.isDragging).toBe(true);

      act(() => {
        result.current.dragHandlers.onDragLeave(createDragEvent());
      });

      expect(result.current.isDragging).toBe(false);
    });

    it("onDrop should add files and set isDragging to false", () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ url: "https://r2.example.com/img.jpg" }),
      });

      const { result } = renderHook(() => useComposerImages());
      const files = [createMockFile("dropped.jpg")];
      const event = createDragEvent(files);

      act(() => {
        result.current.dragHandlers.onDragOver(createDragEvent());
      });

      expect(result.current.isDragging).toBe(true);

      act(() => {
        result.current.dragHandlers.onDrop(event);
      });

      expect(result.current.isDragging).toBe(false);
      expect(result.current.images).toHaveLength(1);
    });

    it("onDrop with no files should not add images", () => {
      const { result } = renderHook(() => useComposerImages());
      const event = createDragEvent([]);

      act(() => {
        result.current.dragHandlers.onDrop(event);
      });

      expect(result.current.images).toHaveLength(0);
    });
  });

  describe("uploadedUrls", () => {
    it("should return only successfully uploaded URLs", async () => {
      let callCount = 0;
      mockFetch.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            ok: true,
            json: async () => ({ url: "https://r2.example.com/img1.jpg" }),
          };
        }
        // Second upload fails
        return {
          ok: false,
          json: async () => ({ error: "Failed" }),
        };
      });

      const { result } = renderHook(() => useComposerImages());

      act(() => {
        result.current.addImages([
          createMockFile("success.jpg"),
          createMockFile("fail.jpg"),
        ]);
      });

      await waitFor(() => {
        expect(
          result.current.images.every((img) => !img.isUploading),
        ).toBe(true);
      });

      expect(result.current.uploadedUrls).toEqual([
        "https://r2.example.com/img1.jpg",
      ]);
    });

    it("should return empty array when no images are uploaded", () => {
      const { result } = renderHook(() => useComposerImages());
      expect(result.current.uploadedUrls).toEqual([]);
    });
  });

  describe("Cleanup", () => {
    it("should revoke all objectURLs on unmount", () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ url: "https://r2.example.com/img.jpg" }),
      });

      const { result, unmount } = renderHook(() => useComposerImages());

      act(() => {
        result.current.addImages([
          createMockFile("a.jpg"),
          createMockFile("b.jpg"),
        ]);
      });

      const urlsBefore = [...createdObjectUrls];
      expect(urlsBefore).toHaveLength(2);

      unmount();

      urlsBefore.forEach((url) => {
        expect(revokedObjectUrls).toContain(url);
      });
    });
  });
});
