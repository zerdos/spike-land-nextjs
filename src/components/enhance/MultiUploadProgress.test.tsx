import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MultiUploadProgress } from "./MultiUploadProgress";

// Helper to create mock File objects
function createMockFile(name: string, size: number = 1024): File {
  const content = new Array(size).fill("a").join("");
  return new File([content], name, { type: "image/png" });
}

describe("MultiUploadProgress Component", () => {
  describe("Rendering", () => {
    it("should render nothing when files array is empty", () => {
      const { container } = render(<MultiUploadProgress files={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it("should render progress container with files", () => {
      const files = [
        {
          file: createMockFile("test1.png"),
          status: "pending" as const,
          progress: 0,
        },
      ];
      render(<MultiUploadProgress files={files} />);
      expect(screen.getByTestId("multi-upload-progress")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      const files = [
        {
          file: createMockFile("test1.png"),
          status: "pending" as const,
          progress: 0,
        },
      ];
      render(<MultiUploadProgress files={files} className="custom-class" />);
      expect(screen.getByTestId("multi-upload-progress")).toHaveClass(
        "custom-class",
      );
    });
  });

  describe("Overall Progress", () => {
    it("should display overall progress percentage", () => {
      const files = [
        {
          file: createMockFile("test1.png"),
          status: "uploading" as const,
          progress: 50,
        },
        {
          file: createMockFile("test2.png"),
          status: "completed" as const,
          progress: 100,
        },
      ];
      render(<MultiUploadProgress files={files} />);
      expect(screen.getByText("75%")).toBeInTheDocument();
    });

    it("should display completed count", () => {
      const files = [
        {
          file: createMockFile("test1.png"),
          status: "completed" as const,
          progress: 100,
        },
        {
          file: createMockFile("test2.png"),
          status: "pending" as const,
          progress: 0,
        },
      ];
      render(<MultiUploadProgress files={files} />);
      expect(screen.getByText("Upload Progress (1/2)")).toBeInTheDocument();
    });

    it("should have accessible progress bar", () => {
      const files = [
        {
          file: createMockFile("test1.png"),
          status: "uploading" as const,
          progress: 50,
        },
      ];
      render(<MultiUploadProgress files={files} />);
      expect(screen.getByLabelText("Overall upload progress"))
        .toBeInTheDocument();
    });
  });

  describe("Status Summary", () => {
    it("should display pending count when files are pending", () => {
      const files = [
        {
          file: createMockFile("test1.png"),
          status: "pending" as const,
          progress: 0,
        },
        {
          file: createMockFile("test2.png"),
          status: "pending" as const,
          progress: 0,
        },
      ];
      render(<MultiUploadProgress files={files} />);
      expect(screen.getByTestId("pending-count")).toHaveTextContent(
        "2 pending",
      );
    });

    it("should display uploading count when files are uploading", () => {
      const files = [
        {
          file: createMockFile("test1.png"),
          status: "uploading" as const,
          progress: 50,
        },
      ];
      render(<MultiUploadProgress files={files} />);
      expect(screen.getByTestId("uploading-count")).toHaveTextContent(
        "1 uploading",
      );
    });

    it("should display completed count when files are completed", () => {
      const files = [
        {
          file: createMockFile("test1.png"),
          status: "completed" as const,
          progress: 100,
        },
        {
          file: createMockFile("test2.png"),
          status: "completed" as const,
          progress: 100,
        },
      ];
      render(<MultiUploadProgress files={files} />);
      expect(screen.getByTestId("completed-count")).toHaveTextContent(
        "2 completed",
      );
    });

    it("should display failed count when files have failed", () => {
      const files = [
        {
          file: createMockFile("test1.png"),
          status: "failed" as const,
          progress: 0,
          error: "Upload failed",
        },
      ];
      render(<MultiUploadProgress files={files} />);
      expect(screen.getByTestId("failed-count")).toHaveTextContent("1 failed");
    });

    it("should display multiple status counts simultaneously", () => {
      const files = [
        {
          file: createMockFile("test1.png"),
          status: "pending" as const,
          progress: 0,
        },
        {
          file: createMockFile("test2.png"),
          status: "uploading" as const,
          progress: 50,
        },
        {
          file: createMockFile("test3.png"),
          status: "completed" as const,
          progress: 100,
        },
        {
          file: createMockFile("test4.png"),
          status: "failed" as const,
          progress: 0,
          error: "Error",
        },
      ];
      render(<MultiUploadProgress files={files} />);
      expect(screen.getByTestId("pending-count")).toHaveTextContent(
        "1 pending",
      );
      expect(screen.getByTestId("uploading-count")).toHaveTextContent(
        "1 uploading",
      );
      expect(screen.getByTestId("completed-count")).toHaveTextContent(
        "1 completed",
      );
      expect(screen.getByTestId("failed-count")).toHaveTextContent("1 failed");
    });
  });

  describe("File List", () => {
    it("should render file items", () => {
      const files = [
        {
          file: createMockFile("test1.png"),
          status: "pending" as const,
          progress: 0,
        },
        {
          file: createMockFile("test2.png"),
          status: "pending" as const,
          progress: 0,
        },
      ];
      render(<MultiUploadProgress files={files} />);
      expect(screen.getByTestId("file-item-0")).toBeInTheDocument();
      expect(screen.getByTestId("file-item-1")).toBeInTheDocument();
    });

    it("should display file names", () => {
      const files = [
        {
          file: createMockFile("test1.png"),
          status: "pending" as const,
          progress: 0,
        },
      ];
      render(<MultiUploadProgress files={files} />);
      expect(screen.getByTestId("file-name-0")).toHaveTextContent("test1.png");
    });

    it("should truncate long file names", () => {
      const files = [
        {
          file: createMockFile(
            "very-long-filename-that-should-be-truncated.png",
          ),
          status: "pending" as const,
          progress: 0,
        },
      ];
      render(<MultiUploadProgress files={files} />);
      const fileName = screen.getByTestId("file-name-0");
      expect(fileName.textContent?.length).toBeLessThanOrEqual(30);
      expect(fileName.textContent).toContain("...");
    });

    it("should display file size", () => {
      const files = [
        {
          file: createMockFile("test1.png", 2048),
          status: "pending" as const,
          progress: 0,
        },
      ];
      render(<MultiUploadProgress files={files} />);
      expect(screen.getByText("2.0 KB")).toBeInTheDocument();
    });

    it("should have accessible file list", () => {
      const files = [
        {
          file: createMockFile("test1.png"),
          status: "pending" as const,
          progress: 0,
        },
      ];
      render(<MultiUploadProgress files={files} />);
      expect(screen.getByRole("list", { name: "Upload file list" }))
        .toBeInTheDocument();
      expect(screen.getByRole("listitem")).toBeInTheDocument();
    });
  });

  describe("Status Icons", () => {
    it("should show pending icon for pending files", () => {
      const files = [
        {
          file: createMockFile("test1.png"),
          status: "pending" as const,
          progress: 0,
        },
      ];
      render(<MultiUploadProgress files={files} />);
      expect(screen.getByLabelText("Pending")).toBeInTheDocument();
    });

    it("should show uploading icon for uploading files", () => {
      const files = [
        {
          file: createMockFile("test1.png"),
          status: "uploading" as const,
          progress: 50,
        },
      ];
      render(<MultiUploadProgress files={files} />);
      expect(screen.getByLabelText("Uploading")).toBeInTheDocument();
    });

    it("should show completed icon for completed files", () => {
      const files = [
        {
          file: createMockFile("test1.png"),
          status: "completed" as const,
          progress: 100,
        },
      ];
      render(<MultiUploadProgress files={files} />);
      expect(screen.getByLabelText("Completed")).toBeInTheDocument();
    });

    it("should show failed icon for failed files", () => {
      const files = [
        {
          file: createMockFile("test1.png"),
          status: "failed" as const,
          progress: 0,
          error: "Upload failed",
        },
      ];
      render(<MultiUploadProgress files={files} />);
      expect(screen.getByLabelText("Failed")).toBeInTheDocument();
    });
  });

  describe("Individual Progress Bar", () => {
    it("should show individual progress bar for uploading files", () => {
      const files = [
        {
          file: createMockFile("test1.png"),
          status: "uploading" as const,
          progress: 50,
        },
      ];
      render(<MultiUploadProgress files={files} />);
      expect(
        screen.getByLabelText("Upload progress for test1.png"),
      ).toBeInTheDocument();
    });

    it("should not show individual progress bar for pending files", () => {
      const files = [
        {
          file: createMockFile("test1.png"),
          status: "pending" as const,
          progress: 0,
        },
      ];
      render(<MultiUploadProgress files={files} />);
      expect(
        screen.queryByLabelText("Upload progress for test1.png"),
      ).not.toBeInTheDocument();
    });

    it("should not show individual progress bar for completed files", () => {
      const files = [
        {
          file: createMockFile("test1.png"),
          status: "completed" as const,
          progress: 100,
        },
      ];
      render(<MultiUploadProgress files={files} />);
      expect(
        screen.queryByLabelText("Upload progress for test1.png"),
      ).not.toBeInTheDocument();
    });
  });

  describe("Error Display", () => {
    it("should display error message for failed files", () => {
      const files = [
        {
          file: createMockFile("test1.png"),
          status: "failed" as const,
          progress: 0,
          error: "Network error occurred",
        },
      ];
      render(<MultiUploadProgress files={files} />);
      expect(screen.getByTestId("file-error-0")).toHaveTextContent(
        "Network error occurred",
      );
    });

    it("should not display error message when error is undefined", () => {
      const files = [
        {
          file: createMockFile("test1.png"),
          status: "failed" as const,
          progress: 0,
        },
      ];
      render(<MultiUploadProgress files={files} />);
      expect(screen.queryByTestId("file-error-0")).not.toBeInTheDocument();
    });

    it("should apply error styling to failed file items", () => {
      const files = [
        {
          file: createMockFile("test1.png"),
          status: "failed" as const,
          progress: 0,
          error: "Error",
        },
      ];
      render(<MultiUploadProgress files={files} />);
      expect(screen.getByTestId("file-item-0")).toHaveClass(
        "border-destructive/50",
      );
    });
  });

  describe("Retry Functionality", () => {
    it("should show retry button for failed files when onRetry is provided", () => {
      const onRetry = vi.fn();
      const files = [
        {
          file: createMockFile("test1.png"),
          status: "failed" as const,
          progress: 0,
          error: "Error",
        },
      ];
      render(<MultiUploadProgress files={files} onRetry={onRetry} />);
      expect(screen.getByTestId("retry-button-0")).toBeInTheDocument();
    });

    it("should not show retry button when onRetry is not provided", () => {
      const files = [
        {
          file: createMockFile("test1.png"),
          status: "failed" as const,
          progress: 0,
          error: "Error",
        },
      ];
      render(<MultiUploadProgress files={files} />);
      expect(screen.queryByTestId("retry-button-0")).not.toBeInTheDocument();
    });

    it("should call onRetry with file when retry button is clicked", () => {
      const onRetry = vi.fn();
      const mockFile = createMockFile("test1.png");
      const files = [
        {
          file: mockFile,
          status: "failed" as const,
          progress: 0,
          error: "Error",
        },
      ];
      render(<MultiUploadProgress files={files} onRetry={onRetry} />);

      fireEvent.click(screen.getByTestId("retry-button-0"));
      expect(onRetry).toHaveBeenCalledWith(mockFile);
    });

    it("should have accessible retry button", () => {
      const onRetry = vi.fn();
      const files = [
        {
          file: createMockFile("test1.png"),
          status: "failed" as const,
          progress: 0,
          error: "Error",
        },
      ];
      render(<MultiUploadProgress files={files} onRetry={onRetry} />);
      expect(screen.getByLabelText("Retry upload for test1.png"))
        .toBeInTheDocument();
    });
  });

  describe("Cancel Functionality", () => {
    it("should show cancel button when uploading and onCancel is provided", () => {
      const onCancel = vi.fn();
      const files = [
        {
          file: createMockFile("test1.png"),
          status: "uploading" as const,
          progress: 50,
        },
      ];
      render(<MultiUploadProgress files={files} onCancel={onCancel} />);
      expect(screen.getByTestId("cancel-button")).toBeInTheDocument();
    });

    it("should show cancel button when pending and onCancel is provided", () => {
      const onCancel = vi.fn();
      const files = [
        {
          file: createMockFile("test1.png"),
          status: "pending" as const,
          progress: 0,
        },
      ];
      render(<MultiUploadProgress files={files} onCancel={onCancel} />);
      expect(screen.getByTestId("cancel-button")).toBeInTheDocument();
    });

    it("should not show cancel button when all files are completed", () => {
      const onCancel = vi.fn();
      const files = [
        {
          file: createMockFile("test1.png"),
          status: "completed" as const,
          progress: 100,
        },
      ];
      render(<MultiUploadProgress files={files} onCancel={onCancel} />);
      expect(screen.queryByTestId("cancel-button")).not.toBeInTheDocument();
    });

    it("should not show cancel button when all files have failed", () => {
      const onCancel = vi.fn();
      const files = [
        {
          file: createMockFile("test1.png"),
          status: "failed" as const,
          progress: 0,
          error: "Error",
        },
      ];
      render(<MultiUploadProgress files={files} onCancel={onCancel} />);
      expect(screen.queryByTestId("cancel-button")).not.toBeInTheDocument();
    });

    it("should not show cancel button when onCancel is not provided", () => {
      const files = [
        {
          file: createMockFile("test1.png"),
          status: "uploading" as const,
          progress: 50,
        },
      ];
      render(<MultiUploadProgress files={files} />);
      expect(screen.queryByTestId("cancel-button")).not.toBeInTheDocument();
    });

    it("should call onCancel when cancel button is clicked", () => {
      const onCancel = vi.fn();
      const files = [
        {
          file: createMockFile("test1.png"),
          status: "uploading" as const,
          progress: 50,
        },
      ];
      render(<MultiUploadProgress files={files} onCancel={onCancel} />);

      fireEvent.click(screen.getByTestId("cancel-button"));
      expect(onCancel).toHaveBeenCalled();
    });

    it("should display cancel button text correctly", () => {
      const onCancel = vi.fn();
      const files = [
        {
          file: createMockFile("test1.png"),
          status: "uploading" as const,
          progress: 50,
        },
      ];
      render(<MultiUploadProgress files={files} onCancel={onCancel} />);
      expect(screen.getByText("Cancel Upload")).toBeInTheDocument();
    });
  });

  describe("Success Styling", () => {
    it("should apply success styling to completed file items", () => {
      const files = [
        {
          file: createMockFile("test1.png"),
          status: "completed" as const,
          progress: 100,
        },
      ];
      render(<MultiUploadProgress files={files} />);
      expect(screen.getByTestId("file-item-0")).toHaveClass(
        "border-green-500/30",
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle files with same name", () => {
      const files = [
        {
          file: createMockFile("test.png"),
          status: "pending" as const,
          progress: 0,
        },
        {
          file: createMockFile("test.png"),
          status: "uploading" as const,
          progress: 50,
        },
      ];
      render(<MultiUploadProgress files={files} />);
      expect(screen.getByTestId("file-item-0")).toBeInTheDocument();
      expect(screen.getByTestId("file-item-1")).toBeInTheDocument();
    });

    it("should handle files without extension", () => {
      const files = [
        {
          file: createMockFile("testfile"),
          status: "pending" as const,
          progress: 0,
        },
      ];
      render(<MultiUploadProgress files={files} />);
      expect(screen.getByTestId("file-name-0")).toHaveTextContent("testfile");
    });

    it("should calculate progress correctly with zero progress files", () => {
      const files = [
        {
          file: createMockFile("test1.png"),
          status: "pending" as const,
          progress: 0,
        },
        {
          file: createMockFile("test2.png"),
          status: "pending" as const,
          progress: 0,
        },
      ];
      render(<MultiUploadProgress files={files} />);
      expect(screen.getByText("0%")).toBeInTheDocument();
    });

    it("should calculate progress correctly with mixed progress", () => {
      const files = [
        {
          file: createMockFile("test1.png"),
          status: "completed" as const,
          progress: 100,
        },
        {
          file: createMockFile("test2.png"),
          status: "uploading" as const,
          progress: 50,
        },
        {
          file: createMockFile("test3.png"),
          status: "pending" as const,
          progress: 0,
        },
      ];
      render(<MultiUploadProgress files={files} />);
      // (100 + 50 + 0) / 3 = 50
      expect(screen.getByText("50%")).toBeInTheDocument();
    });
  });

  describe("Cancelled Status", () => {
    it("should show cancelled icon for cancelled files", () => {
      const files = [
        {
          file: createMockFile("test1.png"),
          status: "cancelled" as const,
          progress: 0,
        },
      ];
      render(<MultiUploadProgress files={files} />);
      expect(screen.getByLabelText("Cancelled")).toBeInTheDocument();
    });

    it("should not show cancel button when all files are cancelled", () => {
      const onCancel = vi.fn();
      const files = [
        {
          file: createMockFile("test1.png"),
          status: "cancelled" as const,
          progress: 0,
        },
      ];
      render(<MultiUploadProgress files={files} onCancel={onCancel} />);
      expect(screen.queryByTestId("cancel-button")).not.toBeInTheDocument();
    });
  });

  describe("Filename Truncation Edge Cases", () => {
    it("should handle very long filename without extension that exceeds maxLength", () => {
      const files = [
        {
          file: createMockFile(
            "averylongfilenamethatdefinitelyexceedsthemaxlength",
          ),
          status: "pending" as const,
          progress: 0,
        },
      ];
      render(<MultiUploadProgress files={files} />);
      const fileName = screen.getByTestId("file-name-0");
      expect(fileName.textContent?.length).toBeLessThanOrEqual(30);
      expect(fileName.textContent).toContain("...");
    });

    it("should handle filename with very long extension", () => {
      // When extension is so long that availableLength <= 0
      const files = [
        {
          file: createMockFile("ab.verylongextensionname1234567890"),
          status: "pending" as const,
          progress: 0,
        },
      ];
      render(<MultiUploadProgress files={files} />);
      const fileName = screen.getByTestId("file-name-0");
      // Should still truncate properly
      expect(fileName.textContent?.length).toBeLessThanOrEqual(30);
    });

    it("should truncate filename when extension makes total exceed maxLength", () => {
      const files = [
        {
          file: createMockFile("thisisaverylongfilename.png"),
          status: "pending" as const,
          progress: 0,
        },
      ];
      render(<MultiUploadProgress files={files} />);
      const fileName = screen.getByTestId("file-name-0");
      expect(fileName.textContent?.length).toBeLessThanOrEqual(30);
      expect(fileName.textContent).toContain("...");
      expect(fileName.textContent).toContain(".png");
    });
  });
});
