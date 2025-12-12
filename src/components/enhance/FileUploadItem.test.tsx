import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FileUploadItem } from "./FileUploadItem";

describe("FileUploadItem", () => {
  const createMockFile = (name: string, size: number): File => {
    return new File(["x".repeat(size)], name, { type: "image/png" });
  };

  describe("pending status", () => {
    it("should render file name and size", () => {
      const file = createMockFile("test-image.png", 2560);
      render(<FileUploadItem file={file} status="pending" progress={0} />);

      expect(screen.getByText("test-image.png")).toBeInTheDocument();
      expect(screen.getByText("2.5 KB")).toBeInTheDocument();
    });

    it("should show upload icon and pending text", () => {
      const file = createMockFile("test.png", 1024);
      render(<FileUploadItem file={file} status="pending" progress={0} />);

      expect(screen.getByText("Pending")).toBeInTheDocument();
    });

    it("should show cancel button when onCancel is provided", () => {
      const file = createMockFile("test.png", 1024);
      const onCancel = vi.fn();
      render(
        <FileUploadItem
          file={file}
          status="pending"
          progress={0}
          onCancel={onCancel}
        />,
      );

      const cancelButton = screen.getByLabelText("Cancel upload");
      expect(cancelButton).toBeInTheDocument();
    });

    it("should call onCancel when cancel button is clicked", () => {
      const file = createMockFile("test.png", 1024);
      const onCancel = vi.fn();
      render(
        <FileUploadItem
          file={file}
          status="pending"
          progress={0}
          onCancel={onCancel}
        />,
      );

      fireEvent.click(screen.getByLabelText("Cancel upload"));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it("should not show cancel button when onCancel is not provided", () => {
      const file = createMockFile("test.png", 1024);
      render(<FileUploadItem file={file} status="pending" progress={0} />);

      expect(screen.queryByLabelText("Cancel upload")).not.toBeInTheDocument();
    });
  });

  describe("uploading status", () => {
    it("should show progress bar and percentage", () => {
      const file = createMockFile("test.png", 1024);
      render(<FileUploadItem file={file} status="uploading" progress={45} />);

      expect(screen.getByText("45%")).toBeInTheDocument();
      expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });

    it("should show cancel button when uploading", () => {
      const file = createMockFile("test.png", 1024);
      const onCancel = vi.fn();
      render(
        <FileUploadItem
          file={file}
          status="uploading"
          progress={50}
          onCancel={onCancel}
        />,
      );

      expect(screen.getByLabelText("Cancel upload")).toBeInTheDocument();
    });

    it("should update progress value correctly", () => {
      const file = createMockFile("test.png", 1024);
      const { rerender } = render(
        <FileUploadItem file={file} status="uploading" progress={25} />,
      );

      expect(screen.getByText("25%")).toBeInTheDocument();

      rerender(
        <FileUploadItem file={file} status="uploading" progress={75} />,
      );

      expect(screen.getByText("75%")).toBeInTheDocument();
    });
  });

  describe("completed status", () => {
    it("should show check icon and completed text", () => {
      const file = createMockFile("test.png", 1024);
      render(<FileUploadItem file={file} status="completed" progress={100} />);

      expect(screen.getByText("Completed")).toBeInTheDocument();
    });

    it("should not show cancel button when completed", () => {
      const file = createMockFile("test.png", 1024);
      const onCancel = vi.fn();
      render(
        <FileUploadItem
          file={file}
          status="completed"
          progress={100}
          onCancel={onCancel}
        />,
      );

      expect(screen.queryByLabelText("Cancel upload")).not.toBeInTheDocument();
    });

    it("should apply green styling when completed", () => {
      const file = createMockFile("test.png", 1024);
      const { container } = render(
        <FileUploadItem file={file} status="completed" progress={100} />,
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain("border-green-500/50");
      expect(wrapper.className).toContain("bg-green-500/5");
    });
  });

  describe("failed status", () => {
    it("should show error icon and failed text", () => {
      const file = createMockFile("test.png", 1024);
      render(
        <FileUploadItem
          file={file}
          status="failed"
          progress={0}
          error="Upload failed"
        />,
      );

      expect(screen.getByText("Failed")).toBeInTheDocument();
    });

    it("should display error message", () => {
      const file = createMockFile("test.png", 1024);
      render(
        <FileUploadItem
          file={file}
          status="failed"
          progress={0}
          error="Network connection lost"
        />,
      );

      expect(screen.getByText("Network connection lost")).toBeInTheDocument();
    });

    it("should show retry button when onRetry is provided", () => {
      const file = createMockFile("test.png", 1024);
      const onRetry = vi.fn();
      render(
        <FileUploadItem
          file={file}
          status="failed"
          progress={0}
          error="Upload failed"
          onRetry={onRetry}
        />,
      );

      expect(screen.getByLabelText("Retry upload")).toBeInTheDocument();
    });

    it("should call onRetry when retry button is clicked", () => {
      const file = createMockFile("test.png", 1024);
      const onRetry = vi.fn();
      render(
        <FileUploadItem
          file={file}
          status="failed"
          progress={0}
          error="Upload failed"
          onRetry={onRetry}
        />,
      );

      fireEvent.click(screen.getByLabelText("Retry upload"));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it("should not show retry button when onRetry is not provided", () => {
      const file = createMockFile("test.png", 1024);
      render(
        <FileUploadItem
          file={file}
          status="failed"
          progress={0}
          error="Upload failed"
        />,
      );

      expect(screen.queryByLabelText("Retry upload")).not.toBeInTheDocument();
    });

    it("should not show cancel button when failed", () => {
      const file = createMockFile("test.png", 1024);
      const onCancel = vi.fn();
      render(
        <FileUploadItem
          file={file}
          status="failed"
          progress={0}
          error="Upload failed"
          onCancel={onCancel}
        />,
      );

      expect(screen.queryByLabelText("Cancel upload")).not.toBeInTheDocument();
    });

    it("should apply destructive styling when failed", () => {
      const file = createMockFile("test.png", 1024);
      const { container } = render(
        <FileUploadItem
          file={file}
          status="failed"
          progress={0}
          error="Upload failed"
        />,
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain("border-destructive/50");
      expect(wrapper.className).toContain("bg-destructive/5");
    });

    it("should not show error message when error is undefined", () => {
      const file = createMockFile("test.png", 1024);
      render(<FileUploadItem file={file} status="failed" progress={0} />);

      expect(screen.getByText("Failed")).toBeInTheDocument();
      const failedText = screen.getByText("Failed");
      const container = failedText.closest(".flex-col");
      expect(container?.querySelectorAll("p").length).toBe(0);
    });
  });

  describe("filename truncation", () => {
    it("should truncate long filenames", () => {
      const file = createMockFile(
        "this-is-a-very-long-filename-that-should-be-truncated.png",
        1024,
      );
      render(<FileUploadItem file={file} status="pending" progress={0} />);

      const filenameElement = screen.getByText(/this-is-a-very-long/);
      expect(filenameElement).toBeInTheDocument();
      expect(filenameElement.textContent).toContain("...");
      expect(filenameElement.textContent).toContain(".png");
    });

    it("should not truncate short filenames", () => {
      const file = createMockFile("short.png", 1024);
      render(<FileUploadItem file={file} status="pending" progress={0} />);

      expect(screen.getByText("short.png")).toBeInTheDocument();
    });

    it("should show full filename in title attribute", () => {
      const longName = "this-is-a-very-long-filename-that-should-be-truncated.png";
      const file = createMockFile(longName, 1024);
      render(<FileUploadItem file={file} status="pending" progress={0} />);

      const filenameElement = screen.getByTitle(longName);
      expect(filenameElement).toBeInTheDocument();
    });
  });

  describe("file size formatting", () => {
    it("should format bytes correctly", () => {
      const file = createMockFile("test.png", 512);
      render(<FileUploadItem file={file} status="pending" progress={0} />);

      expect(screen.getByText("512 B")).toBeInTheDocument();
    });

    it("should format kilobytes correctly", () => {
      const file = createMockFile("test.png", 5120);
      render(<FileUploadItem file={file} status="pending" progress={0} />);

      expect(screen.getByText("5.0 KB")).toBeInTheDocument();
    });

    it("should format megabytes correctly", () => {
      const file = createMockFile("test.png", 2621440);
      render(<FileUploadItem file={file} status="pending" progress={0} />);

      expect(screen.getByText("2.5 MB")).toBeInTheDocument();
    });
  });

  describe("custom className", () => {
    it("should apply custom className", () => {
      const file = createMockFile("test.png", 1024);
      const { container } = render(
        <FileUploadItem
          file={file}
          status="pending"
          progress={0}
          className="custom-class"
        />,
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain("custom-class");
    });
  });

  describe("accessibility", () => {
    it("should have accessible cancel button", () => {
      const file = createMockFile("test.png", 1024);
      const onCancel = vi.fn();
      render(
        <FileUploadItem
          file={file}
          status="pending"
          progress={0}
          onCancel={onCancel}
        />,
      );

      const cancelButton = screen.getByRole("button", { name: "Cancel upload" });
      expect(cancelButton).toBeInTheDocument();
    });

    it("should have accessible retry button", () => {
      const file = createMockFile("test.png", 1024);
      const onRetry = vi.fn();
      render(
        <FileUploadItem
          file={file}
          status="failed"
          progress={0}
          error="Failed"
          onRetry={onRetry}
        />,
      );

      const retryButton = screen.getByRole("button", { name: "Retry upload" });
      expect(retryButton).toBeInTheDocument();
    });

    it("should have accessible progress bar during upload", () => {
      const file = createMockFile("test.png", 1024);
      render(<FileUploadItem file={file} status="uploading" progress={50} />);

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toBeInTheDocument();
    });
  });
});
