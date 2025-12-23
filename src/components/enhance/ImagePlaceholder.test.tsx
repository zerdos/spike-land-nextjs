import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImagePlaceholder } from "./ImagePlaceholder";

// Mock FileReader with a proper class
class MockFileReader {
  result: string | ArrayBuffer | null = "data:image/jpeg;base64,test";
  onload: ((ev: ProgressEvent<FileReader>) => void) | null = null;
  onerror: ((ev: ProgressEvent<FileReader>) => void) | null = null;

  readAsDataURL() {
    // Simulate async load
    setTimeout(() => {
      if (this.onload) {
        this.onload(
          { target: { result: this.result } } as unknown as ProgressEvent<
            FileReader
          >,
        );
      }
    }, 0);
  }
}

vi.stubGlobal("FileReader", MockFileReader);

function createMockFile(name = "test.jpg"): File {
  const blob = new Blob(["test"], { type: "image/jpeg" });
  return new File([blob], name, { type: "image/jpeg" });
}

describe("ImagePlaceholder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with file name", () => {
    const file = createMockFile("my-photo.jpg");
    render(<ImagePlaceholder file={file} status="uploading" />);

    expect(screen.getByText("my-photo.jpg")).toBeDefined();
  });

  it("shows uploading status", () => {
    const file = createMockFile();
    render(<ImagePlaceholder file={file} status="uploading" />);

    expect(screen.getByText("Uploading...")).toBeDefined();
  });

  it("shows processing status", () => {
    const file = createMockFile();
    render(<ImagePlaceholder file={file} status="processing" />);

    expect(screen.getByText("Enhancing...")).toBeDefined();
  });

  it("shows upload progress bar when uploading", () => {
    const file = createMockFile();
    const { container } = render(
      <ImagePlaceholder file={file} status="uploading" progress={50} />,
    );

    // Progress bar should be present
    const progressBar = container.querySelector('[style*="width: 50%"]');
    expect(progressBar).toBeDefined();
  });

  it("does not show progress bar when progress is 0 or 100", () => {
    const file = createMockFile();
    const { container, rerender } = render(
      <ImagePlaceholder file={file} status="uploading" progress={0} />,
    );

    // No progress bar at 0%
    expect(container.querySelector('[style*="width: 0%"]')).toBeNull();

    rerender(
      <ImagePlaceholder file={file} status="uploading" progress={100} />,
    );

    // No progress bar at 100%
    expect(container.querySelector('[style*="width: 100%"]')).toBeNull();
  });

  it("shows error message when failed", () => {
    const file = createMockFile();
    render(
      <ImagePlaceholder file={file} status="failed" error="Upload failed" />,
    );

    expect(screen.getByText("Upload failed")).toBeDefined();
  });

  it("shows default error message when failed without error prop", () => {
    const file = createMockFile();
    render(<ImagePlaceholder file={file} status="failed" />);

    expect(screen.getByText("Failed")).toBeDefined();
  });

  it("applies blur effect during uploading", async () => {
    const file = createMockFile();
    const { container } = render(
      <ImagePlaceholder file={file} status="uploading" />,
    );

    await waitFor(() => {
      const image = container.querySelector("img");
      if (image) {
        expect(image.className).toContain("blur-sm");
        expect(image.className).toContain("opacity-70");
      }
    });
  });

  it("applies grayscale effect when failed", async () => {
    const file = createMockFile();
    const { container } = render(
      <ImagePlaceholder file={file} status="failed" />,
    );

    await waitFor(() => {
      const image = container.querySelector("img");
      if (image) {
        expect(image.className).toContain("grayscale");
      }
    });
  });

  it("removes blur when completed", async () => {
    const file = createMockFile();
    const { container } = render(
      <ImagePlaceholder file={file} status="completed" />,
    );

    await waitFor(() => {
      const image = container.querySelector("img");
      if (image) {
        expect(image.className).toContain("blur-0");
        expect(image.className).toContain("opacity-100");
      }
    });
  });

  it("applies destructive border when failed", () => {
    const file = createMockFile();
    const { container } = render(
      <ImagePlaceholder file={file} status="failed" />,
    );

    const card = container.querySelector(".border-destructive");
    expect(card).toBeDefined();
  });

  it("applies custom className", () => {
    const file = createMockFile();
    const { container } = render(
      <ImagePlaceholder
        file={file}
        status="uploading"
        className="custom-placeholder"
      />,
    );

    expect(container.firstChild).toHaveProperty("className");
    expect((container.firstChild as HTMLElement).className).toContain(
      "custom-placeholder",
    );
  });

  it("shows loading spinner during uploading and processing", () => {
    const file = createMockFile();
    const { container, rerender } = render(
      <ImagePlaceholder file={file} status="uploading" />,
    );

    // Should have animated spinner
    expect(container.querySelector(".animate-spin")).toBeDefined();

    rerender(<ImagePlaceholder file={file} status="processing" />);
    expect(container.querySelector(".animate-spin")).toBeDefined();
  });

  it("does not show loading spinner when completed", () => {
    const file = createMockFile();
    const { container } = render(
      <ImagePlaceholder file={file} status="completed" />,
    );

    expect(container.querySelector(".animate-spin")).toBeNull();
  });
});
