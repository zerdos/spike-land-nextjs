import * as imageProcessor from "@/lib/images/browser-image-processor";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImageSlot, SelectedImage } from "./ImageSlot";

// Mock the image processor
vi.mock("@/lib/images/browser-image-processor", () => ({
  processImageForUpload: vi.fn(),
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />;
  },
}));

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => "blob:test-url");
global.URL.revokeObjectURL = vi.fn();

// Mock alert
global.alert = vi.fn();

describe("ImageSlot", () => {
  const defaultProps = {
    label: "Test Slot",
    image: null,
    onImageSelect: vi.fn(),
    onImageClear: vi.fn(),
    onOpenGallery: vi.fn(),
    disabled: false,
  };

  const mockGalleryImage: SelectedImage = {
    type: "gallery",
    id: "img1",
    url: "https://example.com/img1.jpg",
    name: "Gallery Image",
    width: 800,
    height: 600,
  };

  const mockUploadedImage: SelectedImage = {
    type: "upload",
    id: "upload1",
    url: "blob:test-url",
    name: "Uploaded Image",
    width: 800,
    height: 600,
    base64: "base64data",
    mimeType: "image/jpeg",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state correctly", () => {
    render(<ImageSlot {...defaultProps} />);

    expect(screen.getByText("Test Slot")).toBeInTheDocument();
    expect(screen.getByText("Drag & drop an image")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Select/i })).toBeInTheDocument();
  });

  it("renders with gallery image", () => {
    render(<ImageSlot {...defaultProps} image={mockGalleryImage} />);

    expect(screen.getByAltText("Gallery Image")).toBeInTheDocument();
    expect(screen.getByText("Gallery Image")).toBeInTheDocument();
    expect(screen.getByLabelText("Clear Test Slot")).toBeInTheDocument();
  });

  it("renders with uploaded image", () => {
    render(<ImageSlot {...defaultProps} image={mockUploadedImage} />);

    expect(screen.getByAltText("Uploaded Image")).toBeInTheDocument();
    expect(screen.getByText("Uploaded Image")).toBeInTheDocument();
    expect(screen.getByLabelText("Clear Test Slot")).toBeInTheDocument();
  });

  it("clears image when clear button is clicked", async () => {
    const user = userEvent.setup();
    render(<ImageSlot {...defaultProps} image={mockGalleryImage} />);

    const clearButton = screen.getByLabelText("Clear Test Slot");
    await user.click(clearButton);

    expect(defaultProps.onImageClear).toHaveBeenCalled();
  });

  it("revokes object URL when clearing uploaded image", async () => {
    const user = userEvent.setup();
    render(<ImageSlot {...defaultProps} image={mockUploadedImage} />);

    const clearButton = screen.getByLabelText("Clear Test Slot");
    await user.click(clearButton);

    expect(defaultProps.onImageClear).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test-url");
  });

  it("opens gallery when selected from dropdown", async () => {
    const user = userEvent.setup();
    render(<ImageSlot {...defaultProps} />);

    const selectButton = screen.getByRole("button", { name: /Select/i });
    await user.click(selectButton);

    const galleryOption = await screen.findByText("Choose from gallery");
    await user.click(galleryOption);

    expect(defaultProps.onOpenGallery).toHaveBeenCalled();
  });

  it("handles file upload via hidden input", async () => {
    const user = userEvent.setup();
    const file = new File(["dummy content"], "test.png", { type: "image/png" });
    const processedImage = {
      blob: new Blob(["processed"], { type: "image/webp" }),
      width: 800,
      height: 600,
      base64: "processedBase64",
      mimeType: "image/webp",
    };

    (imageProcessor.processImageForUpload as any).mockResolvedValue(processedImage);

    render(<ImageSlot {...defaultProps} />);

    const fileInput = screen.getByLabelText("Upload Test Slot");
    await user.upload(fileInput, file);

    // Should process image
    await waitFor(() => {
      expect(imageProcessor.processImageForUpload).toHaveBeenCalledWith(file);
    });

    // Should call onImageSelect
    await waitFor(() => {
      expect(defaultProps.onImageSelect).toHaveBeenCalledWith(expect.objectContaining({
        type: "upload",
        name: "test.png",
        url: "blob:test-url",
        width: 800,
        height: 600,
        base64: "processedBase64",
      }));
    });
  });

  it("handles drag and drop", async () => {
    const file = new File(["dummy content"], "drop.png", { type: "image/png" });
    const processedImage = {
      blob: new Blob(["processed"], { type: "image/webp" }),
      width: 800,
      height: 600,
      base64: "processedBase64",
      mimeType: "image/webp",
    };

    (imageProcessor.processImageForUpload as any).mockResolvedValue(processedImage);

    render(<ImageSlot {...defaultProps} />);

    // We need to find the drop zone (the Card component)
    const dropZoneText = screen.getByText("Drag & drop an image");
    const dropZone = dropZoneText.closest(".aspect-square");
    expect(dropZone).toBeInTheDocument();

    // Create drag events
    fireEvent.dragEnter(dropZone!, {
      dataTransfer: {
        files: [file],
        items: [{ kind: "file", type: "image/png" }],
        types: ["Files"],
      },
    });

    fireEvent.dragOver(dropZone!, {
      dataTransfer: {
        files: [file],
        items: [{ kind: "file", type: "image/png" }],
        types: ["Files"],
        dropEffect: "copy",
      },
    });

    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [file],
        items: [{ kind: "file", type: "image/png" }],
        types: ["Files"],
      },
    });

    await waitFor(() => {
      expect(imageProcessor.processImageForUpload).toHaveBeenCalledWith(file);
    });

    expect(defaultProps.onImageSelect).toHaveBeenCalled();
  });

  it("validates file type", async () => {
    const file = new File(["dummy content"], "test.txt", { type: "text/plain" });

    render(<ImageSlot {...defaultProps} />);

    const fileInput = screen.getByLabelText("Upload Test Slot");
    // Manually trigger change to bypass browser 'accept' validation check which userEvent might enforce
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(
        expect.stringContaining("Please use an image file"),
      );
    });
    expect(imageProcessor.processImageForUpload).not.toHaveBeenCalled();
  });

  it("validates file size", async () => {
    const user = userEvent.setup();
    const largeFile = new File(["a".repeat(1024)], "large.jpg", { type: "image/jpeg" });
    Object.defineProperty(largeFile, "size", { value: 21 * 1024 * 1024 });

    render(<ImageSlot {...defaultProps} />);

    const fileInput = screen.getByLabelText("Upload Test Slot");
    await user.upload(fileInput, largeFile);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(expect.stringContaining("Image file is too large"));
    });
    expect(imageProcessor.processImageForUpload).not.toHaveBeenCalled();
  });

  it("handles processing state", async () => {
    const user = userEvent.setup();
    const file = new File(["dummy content"], "test.png", { type: "image/png" });

    // Delay processing to allow checking loading state
    (imageProcessor.processImageForUpload as any).mockImplementation(() =>
      new Promise(resolve =>
        setTimeout(() =>
          resolve({
            blob: new Blob(["processed"]),
            width: 100,
            height: 100,
          }), 100)
      )
    );

    render(<ImageSlot {...defaultProps} />);

    const fileInput = screen.getByLabelText("Upload Test Slot");
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText("Processing...")).toBeInTheDocument();
    });
  });

  it("disables interactions when disabled prop is true", async () => {
    render(<ImageSlot {...defaultProps} disabled={true} />);

    const selectButton = screen.getByRole("button", { name: /Select/i });
    expect(selectButton).toBeDisabled();

    // Try dropping
    const dropZoneText = screen.getByText("Drag & drop an image");
    const dropZone = dropZoneText.closest(".aspect-square");

    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [new File([], "test.png", { type: "image/png" })],
      },
    });

    expect(imageProcessor.processImageForUpload).not.toHaveBeenCalled();
  });
});
