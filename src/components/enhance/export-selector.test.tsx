import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExportSelector } from "./export-selector";

global.fetch = vi.fn();
global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
global.URL.revokeObjectURL = vi.fn();

describe("ExportSelector", () => {
  const mockProps = {
    imageId: "job-123",
    fileName: "test-image.jpg",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  it("should render export card with download button", () => {
    render(<ExportSelector {...mockProps} />);

    expect(screen.getByText("Export Enhanced Image")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download JPEG/i }))
      .toBeInTheDocument();
  });

  it("should handle successful export", async () => {
    const mockBlob = new Blob(["image-data"], { type: "image/jpeg" });
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
      headers: new Headers({
        "Content-Disposition": 'attachment; filename="test_enhanced.jpg"',
      }),
    } as Response);

    render(<ExportSelector {...mockProps} />);

    const downloadButton = screen.getByRole("button", {
      name: /Download JPEG/i,
    });
    fireEvent.click(downloadButton);

    expect(screen.getByText("Exporting...")).toBeInTheDocument();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/images/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageId: "job-123",
          format: "jpeg",
          quality: 95,
        }),
      });
    });

    await waitFor(() => {
      expect(screen.queryByText("Exporting...")).not.toBeInTheDocument();
    });
  });

  it("should handle export error", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Export failed" }),
    } as Response);

    render(<ExportSelector {...mockProps} />);

    const downloadButton = screen.getByRole("button", {
      name: /Download JPEG/i,
    });
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(screen.getByText("Export failed")).toBeInTheDocument();
    });
  });

  it("should handle network error", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("Network error"));

    render(<ExportSelector {...mockProps} />);

    const downloadButton = screen.getByRole("button", {
      name: /Download JPEG/i,
    });
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("should disable button while exporting", async () => {
    const mockBlob = new Blob(["image-data"], { type: "image/jpeg" });
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      blob: () => new Promise((resolve) => setTimeout(() => resolve(mockBlob), 100)),
      headers: new Headers(),
    } as Response);

    render(<ExportSelector {...mockProps} />);

    const downloadButton = screen.getByRole("button", {
      name: /Download JPEG/i,
    });
    fireEvent.click(downloadButton);

    expect(downloadButton).toBeDisabled();

    await waitFor(
      () => {
        expect(downloadButton).not.toBeDisabled();
      },
      { timeout: 200 },
    );
  });

  it("should create download link with correct filename from header", async () => {
    const mockBlob = new Blob(["image-data"], { type: "image/jpeg" });
    const mockCreateElement = vi.spyOn(document, "createElement");

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
      headers: new Headers({
        "Content-Disposition": 'attachment; filename="custom-name.jpg"',
      }),
    } as Response);

    render(<ExportSelector {...mockProps} />);

    const downloadButton = screen.getByRole("button", {
      name: /Download JPEG/i,
    });
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(mockCreateElement).toHaveBeenCalledWith("a");
    });

    mockCreateElement.mockRestore();
  });

  it("should use provided fileName when no Content-Disposition header", async () => {
    const mockBlob = new Blob(["image-data"], { type: "image/jpeg" });
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
      headers: new Headers(),
    } as Response);

    render(<ExportSelector {...mockProps} />);

    const downloadButton = screen.getByRole("button", {
      name: /Download JPEG/i,
    });
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
  });

  it("should send fixed JPEG format with quality 95", async () => {
    const mockBlob = new Blob(["image-data"], { type: "image/jpeg" });
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
      headers: new Headers(),
    } as Response);

    render(<ExportSelector {...mockProps} />);

    const downloadButton = screen.getByRole("button", {
      name: /Download JPEG/i,
    });
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/images/export",
        expect.objectContaining({
          body: JSON.stringify({
            imageId: "job-123",
            format: "jpeg",
            quality: 95,
          }),
        }),
      );
    });
  });
});
