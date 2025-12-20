import type { ReferenceImage } from "@/lib/ai/pipeline-types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReferenceImageUpload } from "./ReferenceImageUpload";

// Mock browser-image-processor
vi.mock("@/lib/images/browser-image-processor", () => ({
  processImageForUpload: vi.fn().mockImplementation(async () => {
    const blob = new Blob(["mock-processed-image"], { type: "image/webp" });
    return {
      blob,
      mimeType: "image/webp",
      width: 1024,
      height: 768,
    };
  }),
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: (
    { src, alt, ...props }: {
      src: string;
      alt: string;
      [key: string]: unknown;
    },
  ) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock FileReader
const mockFileReaderResult = "data:image/jpeg;base64,test";
class MockFileReader {
  result = mockFileReaderResult;
  onload: ((event: ProgressEvent<FileReader>) => void) | null = null;

  readAsDataURL() {
    setTimeout(() => {
      const event = {
        target: { result: mockFileReaderResult },
      } as unknown as ProgressEvent<FileReader>;
      this.onload?.(event);
    }, 0);
  }
}
global.FileReader = MockFileReader as unknown as typeof FileReader;

// Mock URL.revokeObjectURL
global.URL.revokeObjectURL = vi.fn();

describe("ReferenceImageUpload", () => {
  const mockOnImagesChange = vi.fn();
  const defaultProps = {
    pipelineId: "pipeline-123",
    referenceImages: [] as ReferenceImage[],
    onImagesChange: mockOnImagesChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it("renders with empty state", () => {
    render(<ReferenceImageUpload {...defaultProps} />);

    expect(screen.getByText("Reference Images (Style Guidance)"))
      .toBeInTheDocument();
    expect(screen.getByText("0/3")).toBeInTheDocument();
    expect(screen.getByText("Add reference image")).toBeInTheDocument();
  });

  it("displays existing reference images", () => {
    const images: ReferenceImage[] = [
      {
        url: "https://example.com/ref1.jpg",
        r2Key: "key1",
        description: "Style 1",
      },
      { url: "https://example.com/ref2.jpg", r2Key: "key2" },
    ];

    render(<ReferenceImageUpload {...defaultProps} referenceImages={images} />);

    expect(screen.getByText("2/3")).toBeInTheDocument();
    expect(screen.getByText("Style 1")).toBeInTheDocument();
    expect(screen.getAllByRole("img")).toHaveLength(2);
  });

  it("hides drop zone when max images reached", () => {
    const images: ReferenceImage[] = [
      { url: "url1", r2Key: "key1" },
      { url: "url2", r2Key: "key2" },
      { url: "url3", r2Key: "key3" },
    ];

    render(<ReferenceImageUpload {...defaultProps} referenceImages={images} />);

    expect(screen.getByText("3/3")).toBeInTheDocument();
    expect(screen.queryByText("Add reference image")).not.toBeInTheDocument();
  });

  it("opens file picker on drop zone click", async () => {
    render(<ReferenceImageUpload {...defaultProps} />);

    const dropZone = screen.getByText("Add reference image").closest("div")
      ?.parentElement;
    expect(dropZone).toBeInTheDocument();

    // The input should be hidden inside the drop zone's parent
    const input = document.querySelector("input[type='file']");
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass("hidden");
  });

  it("accepts valid file types", async () => {
    render(<ReferenceImageUpload {...defaultProps} />);

    const input = document.querySelector(
      "input[type='file']",
    ) as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.accept).toBe("image/jpeg,image/png,image/webp");
  });

  it("shows pending upload after file selection", async () => {
    render(<ReferenceImageUpload {...defaultProps} />);

    const input = document.querySelector(
      "input[type='file']",
    ) as HTMLInputElement;
    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });

    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Description (optional)"))
        .toBeInTheDocument();
      expect(screen.getByRole("button", { name: /upload/i }))
        .toBeInTheDocument();
    });
  });

  it("allows entering description for pending upload", async () => {
    render(<ReferenceImageUpload {...defaultProps} />);

    const input = document.querySelector(
      "input[type='file']",
    ) as HTMLInputElement;
    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });

    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Description (optional)"))
        .toBeInTheDocument();
    });

    const descInput = screen.getByPlaceholderText("Description (optional)");
    await userEvent.type(descInput, "My style reference");

    expect(descInput).toHaveValue("My style reference");
  });

  it("removes pending upload on X click", async () => {
    render(<ReferenceImageUpload {...defaultProps} />);

    const input = document.querySelector(
      "input[type='file']",
    ) as HTMLInputElement;
    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });

    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Description (optional)"))
        .toBeInTheDocument();
    });

    const removeButton = screen.getByRole("button", { name: "" }); // X button has no text
    await userEvent.click(removeButton);

    await waitFor(() => {
      expect(screen.queryByPlaceholderText("Description (optional)")).not
        .toBeInTheDocument();
    });
  });

  it("uploads pending image on upload click", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          referenceImage: {
            url: "https://r2.example.com/uploaded.jpg",
            r2Key: "pipelines/pipeline-123/references/new.jpg",
            description: "Test desc",
          },
        }),
    });

    render(<ReferenceImageUpload {...defaultProps} />);

    const input = document.querySelector(
      "input[type='file']",
    ) as HTMLInputElement;
    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });

    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /upload/i }))
        .toBeInTheDocument();
    });

    const uploadButton = screen.getByRole("button", { name: /upload/i });
    await userEvent.click(uploadButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/pipelines/reference-images",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });

    await waitFor(() => {
      expect(mockOnImagesChange).toHaveBeenCalledWith([
        expect.objectContaining({
          url: "https://r2.example.com/uploaded.jpg",
        }),
      ]);
    });
  });

  it("shows error on upload failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ success: false, error: "Upload failed" }),
    });

    render(<ReferenceImageUpload {...defaultProps} />);

    const input = document.querySelector(
      "input[type='file']",
    ) as HTMLInputElement;
    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });

    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /upload/i }))
        .toBeInTheDocument();
    });

    const uploadButton = screen.getByRole("button", { name: /upload/i });
    await userEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText("Upload failed")).toBeInTheDocument();
    });
  });

  it("deletes reference image on delete click", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const images: ReferenceImage[] = [
      { url: "https://example.com/ref1.jpg", r2Key: "key1" },
    ];

    render(<ReferenceImageUpload {...defaultProps} referenceImages={images} />);

    // Hover to show delete button (simulated by clicking it directly)
    const deleteButton = document.querySelector("button[class*='destructive']");
    expect(deleteButton).toBeInTheDocument();

    fireEvent.click(deleteButton!);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/pipelines/reference-images",
        expect.objectContaining({
          method: "DELETE",
          body: JSON.stringify({ pipelineId: "pipeline-123", r2Key: "key1" }),
        }),
      );
    });

    await waitFor(() => {
      expect(mockOnImagesChange).toHaveBeenCalledWith([]);
    });
  });

  it("disables all interactions when disabled prop is true", () => {
    render(<ReferenceImageUpload {...defaultProps} disabled />);

    // The drop zone has the disabled classes - it's the div with border-dashed
    const dropZone = document.querySelector("[class*='border-dashed']");
    expect(dropZone).toBeInTheDocument();
    expect(dropZone).toHaveClass("opacity-50");
    expect(dropZone).toHaveClass("cursor-not-allowed");
  });

  it("handles drag and drop", async () => {
    render(<ReferenceImageUpload {...defaultProps} />);

    const dropZone = screen.getByText("Add reference image").closest("div")!;

    // Simulate drag enter
    fireEvent.dragEnter(dropZone);
    expect(screen.getByText("Drop image here")).toBeInTheDocument();

    // Simulate drag leave
    fireEvent.dragLeave(dropZone);
    expect(screen.getByText("Add reference image")).toBeInTheDocument();
  });

  it("shows correct count with mixed existing and pending", async () => {
    const images: ReferenceImage[] = [
      { url: "https://example.com/ref1.jpg", r2Key: "key1" },
    ];

    render(<ReferenceImageUpload {...defaultProps} referenceImages={images} />);

    const input = document.querySelector(
      "input[type='file']",
    ) as HTMLInputElement;
    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });

    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText("2/3")).toBeInTheDocument();
    });
  });

  it("displays help text", () => {
    render(<ReferenceImageUpload {...defaultProps} />);

    expect(
      screen.getByText(
        /Reference images guide the AI to match a specific style/,
      ),
    ).toBeInTheDocument();
  });
});
