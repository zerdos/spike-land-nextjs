import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExportButton } from "./ExportButton";

describe("ExportButton Component", () => {
  let mockAlert: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();

    global.fetch = vi.fn();

    global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
    global.URL.revokeObjectURL = vi.fn();

    mockAlert = vi.spyOn(window, "alert");
    mockAlert.mockImplementation(() => {});
  });

  afterEach(() => {
    mockAlert?.mockRestore();
  });

  it("renders export button", () => {
    render(<ExportButton imageUrl="/test-image.jpg" fileName="test.jpg" />);

    expect(screen.getByRole("button", { name: /Download Enhanced/i })).toBeInTheDocument();
  });

  it("renders download icon", () => {
    render(<ExportButton imageUrl="/test-image.jpg" fileName="test.jpg" />);

    const button = screen.getByRole("button", { name: /Download Enhanced/i });
    expect(button.querySelector("svg")).toBeInTheDocument();
  });

  it("triggers download when button clicked", async () => {
    const mockBlob = new Blob(["test"], { type: "image/jpeg" });
    const mockFetch = vi.fn().mockResolvedValue({
      blob: async () => mockBlob,
    } as Response);
    global.fetch = mockFetch;

    render(<ExportButton imageUrl="/test-image.jpg" fileName="test.jpg" />);

    const button = screen.getByRole("button", { name: /Download Enhanced/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/test-image.jpg");
    });

    expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
  });

  it("handles download errors", async () => {
    const mockError = new Error("Network error");
    const mockFetch = vi.fn().mockRejectedValue(mockError);
    global.fetch = mockFetch;

    render(<ExportButton imageUrl="/test-image.jpg" fileName="test.jpg" />);

    const button = screen.getByRole("button", { name: /Download Enhanced/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("Failed to download image. Please try again.");
    });
  });

  it("renders with outline variant", () => {
    render(<ExportButton imageUrl="/test-image.jpg" fileName="test.jpg" />);

    const button = screen.getByRole("button", { name: /Download Enhanced/i });
    expect(button.className).toContain("outline");
  });
});
