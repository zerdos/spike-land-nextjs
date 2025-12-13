import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMultiFileUpload } from "./useMultiFileUpload";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock crypto.randomUUID for consistent test results
let uuidCounter = 0;
vi.stubGlobal("crypto", {
  randomUUID: () => `test-uuid-${++uuidCounter}`,
});

describe("useMultiFileUpload", () => {
  beforeEach(() => {
    mockFetch.mockClear();
    uuidCounter = 0;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createMockFile = (
    name: string,
    type: string = "image/jpeg",
    size: number = 1024,
  ): File => {
    const file = new File(["content"], name, { type });
    Object.defineProperty(file, "size", { value: size });
    return file;
  };

  describe("initial state", () => {
    it("should initialize with empty state", () => {
      const { result } = renderHook(() => useMultiFileUpload());

      expect(result.current.files).toEqual([]);
      expect(result.current.isUploading).toBe(false);
      expect(result.current.progress).toBe(0);
      expect(result.current.completedCount).toBe(0);
      expect(result.current.failedCount).toBe(0);
      expect(result.current.cancelledCount).toBe(0);
    });

    it("should accept custom options", () => {
      const onUploadComplete = vi.fn();
      const onFileComplete = vi.fn();

      const { result } = renderHook(() =>
        useMultiFileUpload({
          maxFiles: 10,
          maxFileSize: 10 * 1024 * 1024,
          parallel: true,
          onUploadComplete,
          onFileComplete,
        })
      );

      expect(result.current.files).toEqual([]);
    });
  });

  describe("file identification", () => {
    it("should assign unique IDs to each file", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ imageId: "img-123" }),
      });

      const { result } = renderHook(() => useMultiFileUpload());

      const files = [
        createMockFile("file1.jpg"),
        createMockFile("file2.jpg"),
        createMockFile("file3.jpg"),
      ];

      await act(async () => {
        await result.current.upload(files);
      });

      await waitFor(() => {
        expect(result.current.files.length).toBe(3);
      });

      // Each file should have a unique ID
      const ids = result.current.files.map((f) => f.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);

      // IDs should be defined strings
      result.current.files.forEach((f) => {
        expect(typeof f.id).toBe("string");
        expect(f.id.length).toBeGreaterThan(0);
      });
    });
  });

  describe("file validation", () => {
    it("should reject files exceeding max file count", async () => {
      const { result } = renderHook(() => useMultiFileUpload({ maxFiles: 2 }));

      const files = [
        createMockFile("file1.jpg"),
        createMockFile("file2.jpg"),
        createMockFile("file3.jpg"),
      ];

      await act(async () => {
        await expect(result.current.upload(files)).rejects.toThrow(
          "Maximum 2 files allowed",
        );
      });
    });

    it("should reject empty file array", async () => {
      const { result } = renderHook(() => useMultiFileUpload());

      await act(async () => {
        await expect(result.current.upload([])).rejects.toThrow(
          "No files to upload",
        );
      });
    });

    it("should reject files with invalid type", async () => {
      const { result } = renderHook(() => useMultiFileUpload());

      const files = [createMockFile("file.txt", "text/plain")];

      await act(async () => {
        await result.current.upload(files);
      });

      await waitFor(() => {
        expect(result.current.files[0].status).toBe("failed");
        expect(result.current.files[0].error).toContain("Invalid file type");
      });
    });

    it("should reject files exceeding max file size", async () => {
      const { result } = renderHook(() => useMultiFileUpload({ maxFileSize: 1024 }));

      const files = [createMockFile("large.jpg", "image/jpeg", 2048)];

      await act(async () => {
        await result.current.upload(files);
      });

      await waitFor(() => {
        expect(result.current.files[0].status).toBe("failed");
        expect(result.current.files[0].error).toContain("exceeds");
      });
    });

    it("should accept valid file types", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ imageId: "img-123" }),
      });

      const { result } = renderHook(() => useMultiFileUpload());

      const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

      for (const type of validTypes) {
        mockFetch.mockClear();
        const files = [createMockFile("file", type)];

        await act(async () => {
          await result.current.upload(files);
        });

        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalled();
        });
      }
    });
  });

  describe("sequential upload", () => {
    it("should upload files sequentially", async () => {
      const uploadOrder: string[] = [];

      mockFetch.mockImplementation(async (url, options) => {
        const formData = options.body as FormData;
        const file = formData.get("file") as File;
        uploadOrder.push(file.name);

        // Simulate delay
        await new Promise((resolve) => setTimeout(resolve, 50));

        return {
          ok: true,
          json: async () => ({ imageId: `img-${file.name}` }),
        };
      });

      const { result } = renderHook(() => useMultiFileUpload({ parallel: false }));

      const files = [
        createMockFile("file1.jpg"),
        createMockFile("file2.jpg"),
        createMockFile("file3.jpg"),
      ];

      await act(async () => {
        await result.current.upload(files);
      });

      await waitFor(() => {
        expect(result.current.completedCount).toBe(3);
      });

      // Sequential order should be maintained
      expect(uploadOrder).toEqual(["file1.jpg", "file2.jpg", "file3.jpg"]);
    });

    it("should update status during sequential upload", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ imageId: "img-123" }),
      });

      const { result } = renderHook(() => useMultiFileUpload({ parallel: false }));

      const files = [createMockFile("file.jpg")];

      await act(async () => {
        await result.current.upload(files);
      });

      await waitFor(() => {
        expect(result.current.files[0].status).toBe("completed");
        expect(result.current.files[0].imageId).toBe("img-123");
        expect(result.current.files[0].progress).toBe(100);
      });
    });
  });

  describe("parallel upload", () => {
    it("should upload files in parallel", async () => {
      const startTimes: Record<string, number> = {};

      mockFetch.mockImplementation(async (url, options) => {
        const formData = options.body as FormData;
        const file = formData.get("file") as File;
        startTimes[file.name] = Date.now();

        // Simulate delay
        await new Promise((resolve) => setTimeout(resolve, 50));

        return {
          ok: true,
          json: async () => ({ imageId: `img-${file.name}` }),
        };
      });

      const { result } = renderHook(() => useMultiFileUpload({ parallel: true }));

      const files = [
        createMockFile("file1.jpg"),
        createMockFile("file2.jpg"),
        createMockFile("file3.jpg"),
      ];

      await act(async () => {
        await result.current.upload(files);
      });

      await waitFor(() => {
        expect(result.current.completedCount).toBe(3);
      });

      // All uploads should start around the same time (within 100ms)
      const times = Object.values(startTimes);
      const maxDiff = Math.max(...times) - Math.min(...times);
      expect(maxDiff).toBeLessThan(100);
    });

    it("should update correct files in parallel mode (no race condition)", async () => {
      // This test verifies that ID-based updates work correctly when files complete
      // in different order than they were started
      const fileCompletionOrder: string[] = [];

      mockFetch.mockImplementation(async (url, options) => {
        const formData = options.body as FormData;
        const file = formData.get("file") as File;

        // Different delays to ensure files complete in different order
        const delay = file.name === "file1.jpg" ? 100 : file.name === "file2.jpg" ? 10 : 50;
        await new Promise((resolve) => setTimeout(resolve, delay));

        fileCompletionOrder.push(file.name);

        return {
          ok: true,
          json: async () => ({ imageId: `img-${file.name}` }),
        };
      });

      const { result } = renderHook(() => useMultiFileUpload({ parallel: true }));

      const files = [
        createMockFile("file1.jpg"), // Slowest
        createMockFile("file2.jpg"), // Fastest
        createMockFile("file3.jpg"), // Medium
      ];

      await act(async () => {
        await result.current.upload(files);
      });

      await waitFor(() => {
        expect(result.current.completedCount).toBe(3);
      });

      // Files completed in different order (file2 first, then file3, then file1)
      expect(fileCompletionOrder).toEqual(["file2.jpg", "file3.jpg", "file1.jpg"]);

      // But each file should have its correct imageId matching its name
      const file1Status = result.current.files.find((f) => f.file.name === "file1.jpg");
      const file2Status = result.current.files.find((f) => f.file.name === "file2.jpg");
      const file3Status = result.current.files.find((f) => f.file.name === "file3.jpg");

      expect(file1Status?.imageId).toBe("img-file1.jpg");
      expect(file2Status?.imageId).toBe("img-file2.jpg");
      expect(file3Status?.imageId).toBe("img-file3.jpg");

      // All should be completed
      expect(file1Status?.status).toBe("completed");
      expect(file2Status?.status).toBe("completed");
      expect(file3Status?.status).toBe("completed");
    });

    it("should handle mixed success and failure in parallel mode", async () => {
      mockFetch.mockImplementation(async (url, options) => {
        const formData = options.body as FormData;
        const file = formData.get("file") as File;

        // Different delays and outcomes
        if (file.name === "file1.jpg") {
          await new Promise((resolve) => setTimeout(resolve, 50));
          throw new Error("Upload failed for file1");
        } else if (file.name === "file2.jpg") {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return {
            ok: true,
            json: async () => ({ imageId: "img-file2" }),
          };
        } else {
          await new Promise((resolve) => setTimeout(resolve, 30));
          return {
            ok: true,
            json: async () => ({ imageId: "img-file3" }),
          };
        }
      });

      const { result } = renderHook(() => useMultiFileUpload({ parallel: true }));

      const files = [
        createMockFile("file1.jpg"),
        createMockFile("file2.jpg"),
        createMockFile("file3.jpg"),
      ];

      await act(async () => {
        await result.current.upload(files);
      });

      await waitFor(() => {
        expect(result.current.completedCount + result.current.failedCount).toBe(3);
      });

      // Verify each file has the correct status
      const file1Status = result.current.files.find((f) => f.file.name === "file1.jpg");
      const file2Status = result.current.files.find((f) => f.file.name === "file2.jpg");
      const file3Status = result.current.files.find((f) => f.file.name === "file3.jpg");

      expect(file1Status?.status).toBe("failed");
      expect(file1Status?.error).toBe("Upload failed for file1");
      expect(file2Status?.status).toBe("completed");
      expect(file2Status?.imageId).toBe("img-file2");
      expect(file3Status?.status).toBe("completed");
      expect(file3Status?.imageId).toBe("img-file3");
    });
  });

  describe("progress tracking", () => {
    it("should calculate overall progress", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ imageId: "img-123" }),
      });

      const { result } = renderHook(() => useMultiFileUpload());

      const files = [
        createMockFile("file1.jpg"),
        createMockFile("file2.jpg"),
      ];

      await act(async () => {
        await result.current.upload(files);
      });

      await waitFor(() => {
        expect(result.current.progress).toBe(100);
      });
    });

    it("should track completed count", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ imageId: "img-123" }),
      });

      const { result } = renderHook(() => useMultiFileUpload());

      const files = [
        createMockFile("file1.jpg"),
        createMockFile("file2.jpg"),
      ];

      await act(async () => {
        await result.current.upload(files);
      });

      await waitFor(() => {
        expect(result.current.completedCount).toBe(2);
      });
    });

    it("should track failed count", async () => {
      mockFetch.mockRejectedValue(new Error("Upload failed"));

      const { result } = renderHook(() => useMultiFileUpload());

      const files = [
        createMockFile("file1.jpg"),
        createMockFile("file2.jpg"),
      ];

      await act(async () => {
        await result.current.upload(files);
      });

      await waitFor(() => {
        expect(result.current.failedCount).toBe(2);
      });
    });
  });

  describe("error handling", () => {
    it("should handle upload failures", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useMultiFileUpload());

      const files = [createMockFile("file.jpg")];

      await act(async () => {
        await result.current.upload(files);
      });

      await waitFor(() => {
        expect(result.current.files[0].status).toBe("failed");
        expect(result.current.files[0].error).toBe("Network error");
      });
    });

    it("should handle non-ok responses", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        text: async () => "Server error",
      });

      const { result } = renderHook(() => useMultiFileUpload());

      const files = [createMockFile("file.jpg")];

      await act(async () => {
        await result.current.upload(files);
      });

      await waitFor(() => {
        expect(result.current.files[0].status).toBe("failed");
        expect(result.current.files[0].error).toBe("Server error");
      });
    });

    it("should continue uploading other files after one fails", async () => {
      mockFetch
        .mockRejectedValueOnce(new Error("Fail 1"))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ imageId: "img-2" }),
        })
        .mockRejectedValueOnce(new Error("Fail 3"));

      const { result } = renderHook(() => useMultiFileUpload());

      const files = [
        createMockFile("file1.jpg"),
        createMockFile("file2.jpg"),
        createMockFile("file3.jpg"),
      ];

      await act(async () => {
        await result.current.upload(files);
      });

      await waitFor(() => {
        expect(result.current.completedCount).toBe(1);
        expect(result.current.failedCount).toBe(2);
      });

      expect(result.current.files[0].status).toBe("failed");
      expect(result.current.files[1].status).toBe("completed");
      expect(result.current.files[2].status).toBe("failed");
    });
  });

  describe("callbacks", () => {
    it("should call onFileComplete for each successful upload", async () => {
      const onFileComplete = vi.fn();

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ imageId: "img-123" }),
      });

      const { result } = renderHook(() => useMultiFileUpload({ onFileComplete }));

      const files = [
        createMockFile("file1.jpg"),
        createMockFile("file2.jpg"),
      ];

      await act(async () => {
        await result.current.upload(files);
      });

      await waitFor(() => {
        expect(onFileComplete).toHaveBeenCalledTimes(2);
        expect(onFileComplete).toHaveBeenCalledWith("img-123");
      });
    });

    it("should call onUploadComplete when all uploads finish", async () => {
      const onUploadComplete = vi.fn();

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ imageId: "img-123" }),
      });

      const { result } = renderHook(() => useMultiFileUpload({ onUploadComplete }));

      const files = [
        createMockFile("file1.jpg"),
        createMockFile("file2.jpg"),
      ];

      await act(async () => {
        await result.current.upload(files);
      });

      await waitFor(() => {
        expect(onUploadComplete).toHaveBeenCalledTimes(1);
        expect(onUploadComplete).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ status: "completed" }),
            expect.objectContaining({ status: "completed" }),
          ]),
        );
      });
    });

    it("should not call onFileComplete for failed uploads", async () => {
      const onFileComplete = vi.fn();

      mockFetch.mockRejectedValue(new Error("Upload failed"));

      const { result } = renderHook(() => useMultiFileUpload({ onFileComplete }));

      const files = [createMockFile("file.jpg")];

      await act(async () => {
        await result.current.upload(files);
      });

      await waitFor(() => {
        expect(result.current.failedCount).toBe(1);
      });

      expect(onFileComplete).not.toHaveBeenCalled();
    });
  });

  describe("cancellation", () => {
    it("should stop sequential uploads when cancelled mid-way", async () => {
      const uploadedFiles: string[] = [];
      let resolveFirstUpload: ((value: unknown) => void) | null = null;

      mockFetch.mockImplementation(async (url, options) => {
        const formData = options.body as FormData;
        const file = formData.get("file") as File;

        if (file.name === "file1.jpg") {
          // First file: wait for manual resolution
          await new Promise((resolve) => {
            resolveFirstUpload = resolve;
          });
        }

        // Check if aborted before completing
        if (options.signal?.aborted) {
          const abortError = new Error("Aborted");
          abortError.name = "AbortError";
          throw abortError;
        }

        uploadedFiles.push(file.name);
        return {
          ok: true,
          json: async () => ({ imageId: `img-${file.name}` }),
        };
      });

      const { result } = renderHook(() => useMultiFileUpload({ parallel: false }));

      const files = [
        createMockFile("file1.jpg"),
        createMockFile("file2.jpg"),
        createMockFile("file3.jpg"),
      ];

      // Start upload
      act(() => {
        void result.current.upload(files);
      });

      // Wait for upload to start
      await waitFor(() => {
        expect(result.current.isUploading).toBe(true);
      });

      // Cancel while first file is still uploading
      act(() => {
        result.current.cancel();
      });

      // Resolve the first upload (it will still complete since it was in progress)
      if (resolveFirstUpload) {
        resolveFirstUpload({});
      }

      await waitFor(() => {
        expect(result.current.isUploading).toBe(false);
      });

      // Only file1 should have been attempted (since sequential upload stops after cancel)
      // file2 and file3 should never have started uploading due to the signal.aborted check
      expect(uploadedFiles.length).toBeLessThanOrEqual(1);
    });

    it("should cancel uploads", async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: async () => ({ imageId: "img-123" }),
              });
            }, 1000);
          }),
      );

      const { result } = renderHook(() => useMultiFileUpload());

      const files = [createMockFile("file.jpg")];

      act(() => {
        void result.current.upload(files);
      });

      // Cancel immediately
      act(() => {
        result.current.cancel();
      });

      await waitFor(() => {
        expect(result.current.isUploading).toBe(false);
      });
    });

    it("should handle abort errors gracefully", async () => {
      mockFetch.mockImplementation(() => {
        const error = new Error("Aborted");
        error.name = "AbortError";
        throw error;
      });

      const { result } = renderHook(() => useMultiFileUpload());

      const files = [createMockFile("file.jpg")];

      await act(async () => {
        await result.current.upload(files);
      });

      // File should be marked as cancelled for abort (not failed)
      await waitFor(() => {
        expect(result.current.isUploading).toBe(false);
        expect(result.current.files[0].status).toBe("cancelled");
        expect(result.current.failedCount).toBe(0);
        expect(result.current.cancelledCount).toBe(1);
      });
    });

    it("should mark all in-progress and pending files as cancelled when cancel is called", async () => {
      let resolveFirstUpload: ((value: unknown) => void) | null = null;

      mockFetch.mockImplementation(async (url, options) => {
        const formData = options.body as FormData;
        const file = formData.get("file") as File;

        if (file.name === "file1.jpg") {
          // First file: wait for manual resolution
          await new Promise((resolve) => {
            resolveFirstUpload = resolve;
          });
          return {
            ok: true,
            json: async () => ({ imageId: "img-file1" }),
          };
        }
        // Other files: simulate slow upload
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return {
          ok: true,
          json: async () => ({ imageId: `img-${file.name}` }),
        };
      });

      const { result } = renderHook(() => useMultiFileUpload({ parallel: true }));

      const files = [
        createMockFile("file1.jpg"),
        createMockFile("file2.jpg"),
        createMockFile("file3.jpg"),
      ];

      act(() => {
        void result.current.upload(files);
      });

      // Wait for upload to start
      await waitFor(() => {
        expect(result.current.isUploading).toBe(true);
      });

      // Cancel while files are uploading
      act(() => {
        result.current.cancel();
      });

      await waitFor(() => {
        expect(result.current.isUploading).toBe(false);
      });

      // All files should be marked as cancelled
      expect(result.current.cancelledCount).toBe(3);
      result.current.files.forEach((f) => {
        expect(f.status).toBe("cancelled");
      });

      // Clean up the pending promise
      if (resolveFirstUpload) {
        resolveFirstUpload({
          ok: true,
          json: async () => ({ imageId: "img-file1" }),
        });
      }
    });

    it("should track cancelledCount correctly", async () => {
      mockFetch.mockImplementation(() => {
        const error = new Error("Aborted");
        error.name = "AbortError";
        throw error;
      });

      const { result } = renderHook(() => useMultiFileUpload());

      const files = [
        createMockFile("file1.jpg"),
        createMockFile("file2.jpg"),
      ];

      await act(async () => {
        await result.current.upload(files);
      });

      await waitFor(() => {
        expect(result.current.cancelledCount).toBe(2);
        expect(result.current.failedCount).toBe(0);
        expect(result.current.completedCount).toBe(0);
      });
    });
  });

  describe("reset", () => {
    it("should reset all state", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ imageId: "img-123" }),
      });

      const { result } = renderHook(() => useMultiFileUpload());

      const files = [createMockFile("file.jpg")];

      await act(async () => {
        await result.current.upload(files);
      });

      await waitFor(() => {
        expect(result.current.completedCount).toBe(1);
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.files).toEqual([]);
      expect(result.current.isUploading).toBe(false);
      expect(result.current.progress).toBe(0);
      expect(result.current.completedCount).toBe(0);
      expect(result.current.failedCount).toBe(0);
    });

    it("should cancel uploads when resetting", async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: async () => ({ imageId: "img-123" }),
              });
            }, 1000);
          }),
      );

      const { result } = renderHook(() => useMultiFileUpload());

      const files = [createMockFile("file.jpg")];

      act(() => {
        void result.current.upload(files);
      });

      // Reset immediately
      act(() => {
        result.current.reset();
      });

      expect(result.current.isUploading).toBe(false);
      expect(result.current.files).toEqual([]);
    });
  });

  describe("albumId option", () => {
    it("should include albumId in form data when provided", async () => {
      let capturedFormData: FormData | null = null;

      mockFetch.mockImplementation(async (url, options) => {
        capturedFormData = options.body as FormData;
        return {
          ok: true,
          json: async () => ({ imageId: "img-123" }),
        };
      });

      const { result } = renderHook(() => useMultiFileUpload({ albumId: "album-456" }));

      const files = [createMockFile("file.jpg")];

      await act(async () => {
        await result.current.upload(files);
      });

      await waitFor(() => {
        expect(result.current.completedCount).toBe(1);
      });

      expect(capturedFormData).not.toBeNull();
      expect(capturedFormData?.get("albumId")).toBe("album-456");
      expect(capturedFormData?.get("file")).toBeInstanceOf(File);
    });

    it("should not include albumId in form data when not provided", async () => {
      let capturedFormData: FormData | null = null;

      mockFetch.mockImplementation(async (url, options) => {
        capturedFormData = options.body as FormData;
        return {
          ok: true,
          json: async () => ({ imageId: "img-123" }),
        };
      });

      const { result } = renderHook(() => useMultiFileUpload());

      const files = [createMockFile("file.jpg")];

      await act(async () => {
        await result.current.upload(files);
      });

      await waitFor(() => {
        expect(result.current.completedCount).toBe(1);
      });

      expect(capturedFormData).not.toBeNull();
      expect(capturedFormData?.get("albumId")).toBeNull();
    });
  });

  describe("error handling edge cases", () => {
    it("should use default error message when response text is empty", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        text: async () => "",
      });

      const { result } = renderHook(() => useMultiFileUpload());

      const files = [createMockFile("file.jpg")];

      await act(async () => {
        await result.current.upload(files);
      });

      await waitFor(() => {
        expect(result.current.files[0].status).toBe("failed");
        expect(result.current.files[0].error).toBe("Upload failed");
      });
    });

    it("should handle non-Error exceptions gracefully", async () => {
      mockFetch.mockImplementation(() => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw "string error";
      });

      const { result } = renderHook(() => useMultiFileUpload());

      const files = [createMockFile("file.jpg")];

      await act(async () => {
        await result.current.upload(files);
      });

      await waitFor(() => {
        expect(result.current.files[0].status).toBe("failed");
        expect(result.current.files[0].error).toBe("Upload failed");
      });
    });
  });

  describe("isUploading state", () => {
    it("should set isUploading during upload", async () => {
      let resolveUpload: ((value: unknown) => void) | null = null;
      const uploadPromise = new Promise((resolve) => {
        resolveUpload = resolve;
      });

      mockFetch.mockReturnValue(uploadPromise);

      const { result } = renderHook(() => useMultiFileUpload());

      const files = [createMockFile("file.jpg")];

      act(() => {
        void result.current.upload(files);
      });

      await waitFor(() => {
        expect(result.current.isUploading).toBe(true);
      });

      act(() => {
        resolveUpload?.({
          ok: true,
          json: async () => ({ imageId: "img-123" }),
        });
      });

      await waitFor(() => {
        expect(result.current.isUploading).toBe(false);
      });
    });
  });
});
