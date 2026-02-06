import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AssetUploadDialog } from "./AssetUploadDialog";
import { useUploadAsset } from "@/hooks/use-assets";
import { useDropzone } from "react-dropzone";

// Mock hooks
vi.mock("@/hooks/use-assets");
vi.mock("react-dropzone");
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("AssetUploadDialog", () => {
  const mockMutateAsync = vi.fn();
  const mockGetRootProps = vi.fn(() => ({}));
  const mockGetInputProps = vi.fn(() => ({}));

  beforeEach(() => {
    vi.mocked(useUploadAsset).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as any);
  });

  it("renders remove file button with aria-label", async () => {
    // Capture the onDrop callback passed to useDropzone
    let capturedOnDrop: (files: File[]) => void = () => {};

    vi.mocked(useDropzone).mockImplementation(({ onDrop }: any) => {
        capturedOnDrop = onDrop;
        return {
            getRootProps: mockGetRootProps,
            getInputProps: mockGetInputProps,
            isDragActive: false,
        } as any;
    });

    render(
      <AssetUploadDialog
        workspaceId="ws-1"
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    // Simulate file drop
    const file = new File(["content"], "test.png", { type: "image/png" });

    // Invoke the captured callback to update state
    await waitFor(() => {
        if (capturedOnDrop) {
            capturedOnDrop([file]);
        }
    });

    // Check for remove button
    const removeButton = await screen.findByLabelText("Remove file");
    expect(removeButton).toBeInTheDocument();
  });
});
