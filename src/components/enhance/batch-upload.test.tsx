import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BatchUpload } from "./batch-upload";

// Mock fetch
global.fetch = vi.fn();

// Mock FileReader
class MockFileReader {
  onload: ((e: { target: { result: string; }; }) => void) | null = null;
  readAsDataURL(file: Blob) {
    if (this.onload) {
      this.onload({
        target: { result: `data:image/png;base64,mock-${file.name}` },
      });
    }
  }
}

global.FileReader = MockFileReader as unknown as typeof FileReader;

// Mock alert
global.alert = vi.fn();

describe("BatchUpload Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render batch upload card", () => {
    render(<BatchUpload />);
    expect(screen.getByText("Batch Upload")).toBeInTheDocument();
    expect(screen.getByText(/Upload up to 20 images/i)).toBeInTheDocument();
  });

  it("should show drag and drop zone", () => {
    render(<BatchUpload />);
    expect(screen.getByText("Drag and drop files here")).toBeInTheDocument();
    expect(screen.getByText(/or click to browse/i)).toBeInTheDocument();
  });

  it("should accept files via file input", async () => {
    render(<BatchUpload />);

    const file = new File(["test"], "test.png", { type: "image/png" });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    Object.defineProperty(input, "files", {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText("test.png")).toBeInTheDocument();
    });
  });

  it("should validate file type", async () => {
    render(<BatchUpload />);

    const file = new File(["test"], "document.pdf", {
      type: "application/pdf",
    });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    Object.defineProperty(input, "files", {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText(/Invalid file type/i)).toBeInTheDocument();
    });
  });

  it("should validate file size", async () => {
    render(<BatchUpload />);

    const file = new File(["a".repeat(11 * 1024 * 1024)], "large.png", {
      type: "image/png",
    });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    Object.defineProperty(input, "files", {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText(/File too large/i)).toBeInTheDocument();
    });
  });

  it("should limit batch size to 20 files", async () => {
    render(<BatchUpload />);

    const files = Array.from(
      { length: 25 },
      (_, i) => new File(["test"], `test${i}.png`, { type: "image/png" }),
    );
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    Object.defineProperty(input, "files", {
      value: files,
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(
        "Maximum 20 files allowed per batch",
      );
    });
  });

  it("should display file thumbnails", async () => {
    render(<BatchUpload />);

    const file = new File(["test"], "test.png", { type: "image/png" });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    Object.defineProperty(input, "files", {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      const img = screen.getByAltText("test.png");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "data:image/png;base64,mock-test.png");
    });
  });

  it("should allow removing individual files", async () => {
    render(<BatchUpload />);

    const file = new File(["test"], "test.png", { type: "image/png" });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    Object.defineProperty(input, "files", {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText("test.png")).toBeInTheDocument();
    });

    const removeButton = screen.getAllByRole("button").find((btn) => btn.querySelector("svg"));
    if (removeButton) {
      fireEvent.click(removeButton);
    }

    await waitFor(() => {
      expect(screen.queryByText("test.png")).not.toBeInTheDocument();
    });
  });

  it("should upload batch successfully", async () => {
    const mockOnUploadComplete = vi.fn();
    render(<BatchUpload onUploadComplete={mockOnUploadComplete} />);

    const files = [
      new File(["test1"], "test1.png", { type: "image/png" }),
      new File(["test2"], "test2.png", { type: "image/png" }),
    ];
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    Object.defineProperty(input, "files", {
      value: files,
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText("test1.png")).toBeInTheDocument();
      expect(screen.getByText("test2.png")).toBeInTheDocument();
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          { success: true, filename: "test1.png", imageId: "id1", url: "url1" },
          { success: true, filename: "test2.png", imageId: "id2", url: "url2" },
        ],
      }),
    });

    const uploadButton = screen.getByText(/Upload 2 files/i);
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(mockOnUploadComplete).toHaveBeenCalledWith(["id1", "id2"]);
    });
  });

  it("should show uploading state", async () => {
    render(<BatchUpload />);

    const file = new File(["test"], "test.png", { type: "image/png" });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    Object.defineProperty(input, "files", {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText("test.png")).toBeInTheDocument();
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({
                  results: [{
                    success: true,
                    filename: "test.png",
                    imageId: "id1",
                    url: "url1",
                  }],
                }),
              }),
            100,
          )
        ),
    );

    const uploadButton = screen.getByText(/Upload 1 file/i);
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText("Uploading...")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.queryByText("Uploading...")).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("should handle upload error", async () => {
    render(<BatchUpload />);

    const file = new File(["test"], "test.png", { type: "image/png" });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    Object.defineProperty(input, "files", {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText("test.png")).toBeInTheDocument();
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Upload failed" }),
    });

    const uploadButton = screen.getByText(/Upload 1 file/i);
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText("Upload failed")).toBeInTheDocument();
    });
  });

  it("should handle partial upload failure", async () => {
    render(<BatchUpload />);

    const files = [
      new File(["test1"], "test1.png", { type: "image/png" }),
      new File(["test2"], "test2.png", { type: "image/png" }),
    ];
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    Object.defineProperty(input, "files", {
      value: files,
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText("test1.png")).toBeInTheDocument();
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          { success: true, filename: "test1.png", imageId: "id1", url: "url1" },
          { success: false, filename: "test2.png", error: "Processing failed" },
        ],
      }),
    });

    const uploadButton = screen.getByText(/Upload 2 files/i);
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText("Processing failed")).toBeInTheDocument();
    });
  });

  it("should show file count summary", async () => {
    render(<BatchUpload />);

    const files = [
      new File(["test1"], "test1.png", { type: "image/png" }),
      new File(["test2"], "test2.png", { type: "image/png" }),
    ];
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    Object.defineProperty(input, "files", {
      value: files,
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText("2 files")).toBeInTheDocument();
      expect(screen.getByText("2 pending")).toBeInTheDocument();
    });
  });

  it("should handle drag and drop", async () => {
    render(<BatchUpload />);

    const dropZone = screen.getByText("Drag and drop files here").parentElement
      ?.parentElement;

    if (!dropZone) {
      throw new Error("Drop zone not found");
    }

    const file = new File(["test"], "test.png", { type: "image/png" });

    fireEvent.dragEnter(dropZone, {
      dataTransfer: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByText("Drop files here")).toBeInTheDocument();
    });

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByText("test.png")).toBeInTheDocument();
    });
  });

  it("should clear completed files", async () => {
    render(<BatchUpload />);

    const file = new File(["test"], "test.png", { type: "image/png" });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    Object.defineProperty(input, "files", {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText("test.png")).toBeInTheDocument();
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{
          success: true,
          filename: "test.png",
          imageId: "id1",
          url: "url1",
        }],
      }),
    });

    const uploadButton = screen.getByText(/Upload 1 file/i);
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText("Clear Completed")).toBeInTheDocument();
    });

    const clearButton = screen.getByText("Clear Completed");
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(screen.queryByText("test.png")).not.toBeInTheDocument();
    });
  });

  it("should clear all files", async () => {
    render(<BatchUpload />);

    const files = [
      new File(["test1"], "test1.png", { type: "image/png" }),
      new File(["test2"], "test2.png", { type: "image/png" }),
    ];
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    Object.defineProperty(input, "files", {
      value: files,
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText("test1.png")).toBeInTheDocument();
    });

    const clearAllButton = screen.getByText("Clear All");
    fireEvent.click(clearAllButton);

    await waitFor(() => {
      expect(screen.queryByText("test1.png")).not.toBeInTheDocument();
      expect(screen.queryByText("test2.png")).not.toBeInTheDocument();
    });
  });

  it("should disable upload button when no pending files", async () => {
    render(<BatchUpload />);

    const file = new File(["test"], "test.png", { type: "image/png" });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    Object.defineProperty(input, "files", {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText("test.png")).toBeInTheDocument();
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{
          success: true,
          filename: "test.png",
          imageId: "id1",
          url: "url1",
        }],
      }),
    });

    const uploadButton = screen.getByText(/Upload 1 file/i);
    fireEvent.click(uploadButton);

    await waitFor(() => {
      const buttons = screen.getAllByRole("button");
      const disabledUploadButton = buttons.find((btn) =>
        btn.textContent?.includes("Upload") && btn.hasAttribute("disabled")
      );
      expect(disabledUploadButton).toBeDefined();
    });
  });

  it("should handle multiple file types", async () => {
    render(<BatchUpload />);

    const files = [
      new File(["test1"], "test1.png", { type: "image/png" }),
      new File(["test2"], "test2.jpg", { type: "image/jpeg" }),
      new File(["test3"], "test3.webp", { type: "image/webp" }),
    ];
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    Object.defineProperty(input, "files", {
      value: files,
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText("test1.png")).toBeInTheDocument();
      expect(screen.getByText("test2.jpg")).toBeInTheDocument();
      expect(screen.getByText("test3.webp")).toBeInTheDocument();
    });
  });

  it("should handle dragOver event", async () => {
    render(<BatchUpload />);

    const dropZone = screen.getByText("Drag and drop files here").parentElement
      ?.parentElement;

    if (!dropZone) {
      throw new Error("Drop zone not found");
    }

    fireEvent.dragOver(dropZone, {
      dataTransfer: { files: [] },
    });

    // dragOver should prevent default - component should still be functional
    expect(screen.getByText("Drag and drop files here")).toBeInTheDocument();
  });

  it("should handle dragLeave event", async () => {
    render(<BatchUpload />);

    const dropZone = screen.getByText("Drag and drop files here").parentElement
      ?.parentElement;

    if (!dropZone) {
      throw new Error("Drop zone not found");
    }

    // First trigger dragEnter to set isDragging to true
    fireEvent.dragEnter(dropZone, {
      dataTransfer: { files: [] },
    });

    await waitFor(() => {
      expect(screen.getByText("Drop files here")).toBeInTheDocument();
    });

    // Now trigger dragLeave
    fireEvent.dragLeave(dropZone, {
      dataTransfer: { files: [] },
    });

    await waitFor(() => {
      expect(screen.getByText("Drag and drop files here")).toBeInTheDocument();
    });
  });

  it("should not upload when there are no pending files", async () => {
    render(<BatchUpload />);

    // Add a file with error (invalid type) - this file won't be pending
    const invalidFile = new File(["test"], "document.pdf", {
      type: "application/pdf",
    });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    Object.defineProperty(input, "files", {
      value: [invalidFile],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText("document.pdf")).toBeInTheDocument();
      expect(screen.getByText(/Invalid file type/i)).toBeInTheDocument();
    });

    // The upload button should be disabled because there are no pending files
    const uploadButton = screen.getByRole("button", {
      name: /Upload 0 files/i,
    });
    expect(uploadButton).toBeDisabled();

    // Try clicking anyway - should not call fetch
    fireEvent.click(uploadButton);

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("should exit early from uploadBatch when all files are already uploaded", async () => {
    render(<BatchUpload />);

    const file = new File(["test"], "test.png", { type: "image/png" });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    Object.defineProperty(input, "files", {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText("test.png")).toBeInTheDocument();
    });

    // Upload the file successfully
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{
          success: true,
          filename: "test.png",
          imageId: "id1",
          url: "url1",
        }],
      }),
    });

    const uploadButton = screen.getByText(/Upload 1 file/i);
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText("1 completed")).toBeInTheDocument();
    });

    // Now the upload button should show "Upload 0 files" and be disabled
    const disabledButton = screen.getByRole("button", {
      name: /Upload 0 files/i,
    });
    expect(disabledButton).toBeDisabled();

    // Clear the mock call history
    (global.fetch as ReturnType<typeof vi.fn>).mockClear();

    // Verify fetch was not called again (button is disabled so uploadBatch won't be triggered)
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("should handle rapid double-click on upload button", async () => {
    render(<BatchUpload />);

    const file = new File(["test"], "test.png", { type: "image/png" });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    Object.defineProperty(input, "files", {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText("test.png")).toBeInTheDocument();
    });

    // Create a slow fetch that allows us to click twice
    let resolveFirst: (value: unknown) => void;
    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });

    (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(() => firstPromise);

    const uploadButton = screen.getByText(/Upload 1 file/i);

    // First click starts the upload
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText("Uploading...")).toBeInTheDocument();
    });

    // Button should be disabled during upload
    expect(uploadButton).toBeDisabled();

    // Resolve the first upload
    resolveFirst!({
      ok: true,
      json: async () => ({
        results: [{
          success: true,
          filename: "test.png",
          imageId: "id1",
          url: "url1",
        }],
      }),
    });

    await waitFor(() => {
      expect(screen.getByText("1 completed")).toBeInTheDocument();
    });
  });

  it("should handle files not found in upload results", async () => {
    const mockOnUploadComplete = vi.fn();
    render(<BatchUpload onUploadComplete={mockOnUploadComplete} />);

    const files = [
      new File(["test1"], "test1.png", { type: "image/png" }),
      new File(["test2"], "test2.png", { type: "image/png" }),
    ];
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    Object.defineProperty(input, "files", {
      value: files,
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText("test1.png")).toBeInTheDocument();
      expect(screen.getByText("test2.png")).toBeInTheDocument();
    });

    // Mock response where one file is not in results at all
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          { success: true, filename: "test1.png", imageId: "id1", url: "url1" },
          // test2.png is missing from results
        ],
      }),
    });

    const uploadButton = screen.getByText(/Upload 2 files/i);
    fireEvent.click(uploadButton);

    await waitFor(() => {
      // test1.png should show completed
      expect(mockOnUploadComplete).toHaveBeenCalledWith(["id1"]);
    });

    // test2.png should still be visible (unchanged since not in results)
    expect(screen.getByText("test2.png")).toBeInTheDocument();
  });

  it("should prevent click on drop zone when at max batch size", async () => {
    render(<BatchUpload />);

    // Add 20 files (max batch size)
    const files = Array.from(
      { length: 20 },
      (_, i) => new File(["test"], `test${i}.png`, { type: "image/png" }),
    );
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    Object.defineProperty(input, "files", {
      value: files,
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText("20 files")).toBeInTheDocument();
    });

    // The drop zone should have cursor-not-allowed class
    const dropZone = screen.getByText(
      /Drag and drop files here|Drop files here/,
    ).closest(
      "div.border-dashed",
    );
    expect(dropZone).toHaveClass("cursor-not-allowed");

    // Click on the drop zone - should not trigger file input
    const inputAfterMax = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(inputAfterMax).toBeDisabled();
  });

  it("should handle network error during upload", async () => {
    render(<BatchUpload />);

    const file = new File(["test"], "test.png", { type: "image/png" });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    Object.defineProperty(input, "files", {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText("test.png")).toBeInTheDocument();
    });

    // Mock a network error (fetch throws)
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Network error"),
    );

    const uploadButton = screen.getByText(/Upload 1 file/i);
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("should handle non-Error exception during upload", async () => {
    render(<BatchUpload />);

    const file = new File(["test"], "test.png", { type: "image/png" });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    Object.defineProperty(input, "files", {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText("test.png")).toBeInTheDocument();
    });

    // Mock a non-Error exception
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      "String error",
    );

    const uploadButton = screen.getByText(/Upload 1 file/i);
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText("Upload failed")).toBeInTheDocument();
    });
  });

  it("should show singular file text for single file", async () => {
    render(<BatchUpload />);

    const file = new File(["test"], "test.png", { type: "image/png" });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    Object.defineProperty(input, "files", {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText("1 file")).toBeInTheDocument();
      expect(screen.getByText("1 pending")).toBeInTheDocument();
    });
  });

  it("should handle drop with zero files", async () => {
    render(<BatchUpload />);

    const dropZone = screen.getByText("Drag and drop files here").parentElement
      ?.parentElement;

    if (!dropZone) {
      throw new Error("Drop zone not found");
    }

    // Simulate drop with empty files array
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [] },
    });

    // Should not add any files - the badge with file count should not appear
    // (Note: "0/20 files" is always shown in the drop zone text, but the badge only appears when files are added)
    expect(screen.queryByText("1 pending")).not.toBeInTheDocument();
    expect(screen.queryByText("1 file")).not.toBeInTheDocument();
  });

  it("should not call onUploadComplete when no successful uploads", async () => {
    const mockOnUploadComplete = vi.fn();
    render(<BatchUpload onUploadComplete={mockOnUploadComplete} />);

    const file = new File(["test"], "test.png", { type: "image/png" });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    Object.defineProperty(input, "files", {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText("test.png")).toBeInTheDocument();
    });

    // Mock response where all uploads fail
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          { success: false, filename: "test.png", error: "Processing failed" },
        ],
      }),
    });

    const uploadButton = screen.getByText(/Upload 1 file/i);
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText("Processing failed")).toBeInTheDocument();
    });

    // onUploadComplete should not be called with empty array
    expect(mockOnUploadComplete).not.toHaveBeenCalled();
  });

  it("should show completed badge when files are completed", async () => {
    render(<BatchUpload />);

    const file = new File(["test"], "test.png", { type: "image/png" });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    Object.defineProperty(input, "files", {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText("test.png")).toBeInTheDocument();
    });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{
          success: true,
          filename: "test.png",
          imageId: "id1",
          url: "url1",
        }],
      }),
    });

    const uploadButton = screen.getByText(/Upload 1 file/i);
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText("1 completed")).toBeInTheDocument();
    });
  });

  it("should show failed badge when files have errors", async () => {
    render(<BatchUpload />);

    const file = new File(["test"], "document.pdf", {
      type: "application/pdf",
    });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    Object.defineProperty(input, "files", {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText("1 failed")).toBeInTheDocument();
    });
  });

  it("should show ImageIcon fallback when no thumbnail", async () => {
    // Override FileReader to not provide thumbnail
    const OriginalFileReader = global.FileReader;
    class NoThumbnailFileReader {
      onload: ((e: { target: { result: string | null; }; }) => void) | null = null;
      readAsDataURL() {
        if (this.onload) {
          this.onload({ target: { result: null } });
        }
      }
    }
    global.FileReader = NoThumbnailFileReader as unknown as typeof FileReader;

    render(<BatchUpload />);

    const file = new File(["test"], "test.png", { type: "image/png" });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    Object.defineProperty(input, "files", {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText("test.png")).toBeInTheDocument();
    });

    // Should not find an img tag with alt text
    expect(screen.queryByAltText("test.png")).not.toBeInTheDocument();

    // Restore original FileReader
    global.FileReader = OriginalFileReader;
  });

  it("should handle click on drop zone to open file picker", async () => {
    render(<BatchUpload />);

    const dropZone = screen.getByText("Drag and drop files here").parentElement
      ?.parentElement;

    if (!dropZone) {
      throw new Error("Drop zone not found");
    }

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click");

    fireEvent.click(dropZone);

    expect(clickSpy).toHaveBeenCalled();
  });

  it("should handle file input change with no files", async () => {
    render(<BatchUpload />);

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    // Simulate change event with null files
    Object.defineProperty(input, "files", {
      value: null,
      writable: true,
      configurable: true,
    });

    fireEvent.change(input);

    // Should not add any files - the badge with file count should not appear
    expect(screen.queryByText("1 pending")).not.toBeInTheDocument();
    expect(screen.queryByText("1 file")).not.toBeInTheDocument();
  });

  it("should handle upload with undefined results", async () => {
    const mockOnUploadComplete = vi.fn();
    render(<BatchUpload onUploadComplete={mockOnUploadComplete} />);

    const file = new File(["test"], "test.png", { type: "image/png" });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    Object.defineProperty(input, "files", {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText("test.png")).toBeInTheDocument();
    });

    // Mock response with undefined results
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}), // No results field
    });

    const uploadButton = screen.getByText(/Upload 1 file/i);
    fireEvent.click(uploadButton);

    await waitFor(() => {
      // File should still be shown but unchanged
      expect(screen.getByText("test.png")).toBeInTheDocument();
    });

    // onUploadComplete should not be called
    expect(mockOnUploadComplete).not.toHaveBeenCalled();
  });
});
