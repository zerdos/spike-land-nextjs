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
      this.onload({ target: { result: `data:image/png;base64,mock-${file.name}` } });
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
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

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

    const file = new File(["test"], "document.pdf", { type: "application/pdf" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

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
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

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
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(input, "files", {
      value: files,
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith("Maximum 20 files allowed per batch");
    });
  });

  it("should display file thumbnails", async () => {
    render(<BatchUpload />);

    const file = new File(["test"], "test.png", { type: "image/png" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

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
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(input, "files", {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText("test.png")).toBeInTheDocument();
    });

    const removeButton = screen.getAllByRole("button").find(btn => btn.querySelector("svg"));
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
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

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
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

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
                  results: [{ success: true, filename: "test.png", imageId: "id1", url: "url1" }],
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
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

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
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

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
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

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

    const dropZone = screen.getByText("Drag and drop files here").parentElement?.parentElement;

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
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

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
        results: [{ success: true, filename: "test.png", imageId: "id1", url: "url1" }],
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
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

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
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

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
        results: [{ success: true, filename: "test.png", imageId: "id1", url: "url1" }],
      }),
    });

    const uploadButton = screen.getByText(/Upload 1 file/i);
    fireEvent.click(uploadButton);

    await waitFor(() => {
      const buttons = screen.getAllByRole("button");
      const disabledUploadButton = buttons.find(btn =>
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
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

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
});
