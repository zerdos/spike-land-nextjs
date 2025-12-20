import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImageUpload } from "./ImageUpload";

// Mock browser-image-processor
vi.mock("@/lib/images/browser-image-processor", () => ({
  processImageForUpload: vi.fn().mockImplementation(async (file: File) => {
    // Return a mock processed result that creates a file-like blob
    const blob = new Blob(["mock-processed-image"], { type: "image/webp" });
    return {
      blob,
      mimeType: "image/webp",
      width: 1024,
      height: 768,
      originalName: file.name,
    };
  }),
}));

describe("ImageUpload Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render upload button", () => {
    render(<ImageUpload />);
    expect(screen.getByText("Upload Images")).toBeInTheDocument();
    expect(screen.getByText("Select Images")).toBeInTheDocument();
  });

  it("should show upload icon when not uploading", () => {
    render(<ImageUpload />);
    // SVG icon should be present (Lucide icon)
    const container = screen.getByText("Upload Images").parentElement;
    expect(container?.querySelector("svg")).toBeInTheDocument();
  });

  it("should show supported file formats message", () => {
    render(<ImageUpload />);
    expect(
      screen.getByText(/Supports JPEG, PNG, and WebP up to 50MB/i),
    ).toBeInTheDocument();
  });

  it("should show uploading state when isUploading is true", () => {
    render(<ImageUpload isUploading={true} />);
    expect(screen.getByText("Uploading...")).toBeInTheDocument();
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });

  it("should call onFilesSelected when files are selected", async () => {
    const mockOnFilesSelected = vi.fn().mockResolvedValue(undefined);
    render(<ImageUpload onFilesSelected={mockOnFilesSelected} />);

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
      expect(mockOnFilesSelected).toHaveBeenCalledTimes(1);
      // Files are processed before being passed to onFilesSelected
      const calledFiles = mockOnFilesSelected.mock.calls[0][0] as File[];
      expect(calledFiles).toHaveLength(1);
      expect(calledFiles[0].name).toBe("test.webp");
      expect(calledFiles[0].type).toBe("image/webp");
    });
  });

  it("should call onFilesSelected with multiple files", async () => {
    const mockOnFilesSelected = vi.fn().mockResolvedValue(undefined);
    render(<ImageUpload onFilesSelected={mockOnFilesSelected} />);

    const file1 = new File(["test1"], "test1.png", { type: "image/png" });
    const file2 = new File(["test2"], "test2.jpg", { type: "image/jpeg" });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    Object.defineProperty(input, "files", {
      value: [file1, file2],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(mockOnFilesSelected).toHaveBeenCalledTimes(1);
      // Files are processed before being passed to onFilesSelected
      const calledFiles = mockOnFilesSelected.mock.calls[0][0] as File[];
      expect(calledFiles).toHaveLength(2);
      expect(calledFiles[0].name).toBe("test1.webp");
      expect(calledFiles[1].name).toBe("test2.webp");
    });
  });

  it("should show error when onFilesSelected throws", async () => {
    const mockOnFilesSelected = vi.fn().mockRejectedValue(
      new Error("Upload failed"),
    );
    render(<ImageUpload onFilesSelected={mockOnFilesSelected} />);

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
      expect(screen.getByText("Upload failed")).toBeInTheDocument();
    });
  });

  it("should not call onFilesSelected when no files are selected", async () => {
    const mockOnFilesSelected = vi.fn().mockResolvedValue(undefined);
    render(<ImageUpload onFilesSelected={mockOnFilesSelected} />);

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    Object.defineProperty(input, "files", {
      value: [],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(mockOnFilesSelected).not.toHaveBeenCalled();
    });
  });

  it("should disable input during upload", () => {
    render(<ImageUpload isUploading={true} />);

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(input).toBeDisabled();
  });

  it("should have multiple attribute on file input", () => {
    render(<ImageUpload />);

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(input).toHaveAttribute("multiple");
  });

  it("should accept image files", () => {
    render(<ImageUpload />);

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(input).toHaveAttribute("accept", "image/*");
  });

  it("should clear error when new file is selected", async () => {
    const mockOnFilesSelected = vi.fn()
      .mockRejectedValueOnce(new Error("First error"))
      .mockResolvedValueOnce(undefined);

    render(<ImageUpload onFilesSelected={mockOnFilesSelected} />);

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    // First upload - trigger error
    const file1 = new File(["test1"], "test1.png", { type: "image/png" });
    Object.defineProperty(input, "files", {
      value: [file1],
      writable: false,
      configurable: true,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText("First error")).toBeInTheDocument();
    });

    // Second upload - should clear error
    const file2 = new File(["test2"], "test2.png", { type: "image/png" });
    Object.defineProperty(input, "files", {
      value: [file2],
      writable: false,
      configurable: true,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.queryByText("First error")).not.toBeInTheDocument();
    });
  });

  it("should show dragging state when dragging over", () => {
    const { container } = render(<ImageUpload />);
    const card = container.querySelector(".border-dashed");

    fireEvent.dragOver(card!);

    expect(card).toHaveClass("border-primary");
  });

  it("should remove dragging state when drag leaves", () => {
    const { container } = render(<ImageUpload />);
    const card = container.querySelector(".border-dashed");

    fireEvent.dragOver(card!);
    fireEvent.dragLeave(card!);

    expect(card).not.toHaveClass("border-primary");
  });

  it("should call onFilesSelected when files are dropped", async () => {
    const mockOnFilesSelected = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <ImageUpload onFilesSelected={mockOnFilesSelected} />,
    );
    const card = container.querySelector(".border-dashed");

    const file = new File(["test"], "test.png", { type: "image/png" });
    const dataTransfer = {
      files: [file],
    };

    fireEvent.drop(card!, { dataTransfer });

    await waitFor(() => {
      expect(mockOnFilesSelected).toHaveBeenCalledWith([file]);
    });
  });

  it("should trigger file input when button is clicked", () => {
    render(<ImageUpload />);

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click");

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(clickSpy).toHaveBeenCalled();
  });

  it("should work without onFilesSelected callback", async () => {
    render(<ImageUpload />);

    const file = new File(["test"], "test.png", { type: "image/png" });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    Object.defineProperty(input, "files", {
      value: [file],
      writable: false,
    });

    // Should not throw
    fireEvent.change(input);

    // Wait a tick to ensure no errors
    await waitFor(() => {
      expect(input).toBeInTheDocument();
    });
  });

  it("should show generic error message when onFilesSelected throws non-Error", async () => {
    const mockOnFilesSelected = vi.fn().mockRejectedValue("string error");
    render(<ImageUpload onFilesSelected={mockOnFilesSelected} />);

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
      expect(screen.getByText("Upload failed")).toBeInTheDocument();
    });
  });

  it("should not call onFilesSelected when input files is null", async () => {
    const mockOnFilesSelected = vi.fn().mockResolvedValue(undefined);
    render(<ImageUpload onFilesSelected={mockOnFilesSelected} />);

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    Object.defineProperty(input, "files", {
      value: null,
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(mockOnFilesSelected).not.toHaveBeenCalled();
    });
  });

  it("should not call onFilesSelected when drop has null files", async () => {
    const mockOnFilesSelected = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <ImageUpload onFilesSelected={mockOnFilesSelected} />,
    );
    const card = container.querySelector(".border-dashed");

    const dataTransfer = {
      files: null,
    };

    fireEvent.drop(card!, { dataTransfer });

    await waitFor(() => {
      expect(mockOnFilesSelected).not.toHaveBeenCalled();
    });
  });

  it("should reset file input value after successful upload", async () => {
    const mockOnFilesSelected = vi.fn().mockResolvedValue(undefined);
    render(<ImageUpload onFilesSelected={mockOnFilesSelected} />);

    const file = new File(["test"], "test.png", { type: "image/png" });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    // Set initial value to simulate a file selection
    Object.defineProperty(input, "value", {
      value: "C:\\fakepath\\test.png",
      writable: true,
      configurable: true,
    });

    Object.defineProperty(input, "files", {
      value: [file],
      writable: false,
      configurable: true,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(mockOnFilesSelected).toHaveBeenCalledWith([file]);
    });

    // The input value should be reset to empty
    expect(input.value).toBe("");
  });
});
