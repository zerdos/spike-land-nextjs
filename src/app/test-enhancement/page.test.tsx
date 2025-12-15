import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TestEnhancementPage from "./page";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock alert
const mockAlert = vi.fn();
global.alert = mockAlert;

// Mock console.error - will be set up in beforeEach
let mockConsoleError: ReturnType<typeof vi.spyOn>;

// Mock FileReader
const mockFileReaderResult = "data:image/png;base64,test123";
const mockFileReaderInstance = {
  readAsDataURL: vi.fn(),
  result: mockFileReaderResult,
  onloadend: null as
    | ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown)
    | null,
};

class MockFileReader {
  result = mockFileReaderResult;
  onloadend:
    | ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown)
    | null = null;

  readAsDataURL(_file: Blob): void {
    mockFileReaderInstance.readAsDataURL(_file);
    mockFileReaderInstance.onloadend = this.onloadend;
    // Simulate async file reading
    setTimeout(() => {
      if (this.onloadend) {
        this.onloadend.call(
          this as unknown as FileReader,
          {} as ProgressEvent<FileReader>,
        );
      }
    }, 0);
  }
}

vi.stubGlobal("FileReader", MockFileReader);

describe("TestEnhancementPage", () => {
  // Helper to set up default token balance mock
  const setupDefaultBalanceMock = () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ balance: 50 }),
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mockFetch to clear any leftover mock implementations from previous tests
    mockFetch.mockReset();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // Set up console.error spy fresh for each test
    mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    // Each test sets up its own mocks
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("Initial Render", () => {
    it("should render the page with title", async () => {
      setupDefaultBalanceMock();
      render(<TestEnhancementPage />);

      await waitFor(() => {
        expect(screen.getByText("Image Enhancement Demo")).toBeInTheDocument();
      });
    });

    it("should fetch token balance on mount", async () => {
      setupDefaultBalanceMock();
      render(<TestEnhancementPage />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/tokens/balance");
      });
    });

    it("should display token balance after loading", async () => {
      setupDefaultBalanceMock();
      render(<TestEnhancementPage />);

      await waitFor(() => {
        expect(screen.getByText(/Token Balance: 50/)).toBeInTheDocument();
      });
    });

    it("should show loading state for token balance initially", () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
      render(<TestEnhancementPage />);

      expect(screen.getByText(/Token Balance: \.\.\./)).toBeInTheDocument();
    });

    it("should render file upload input", () => {
      setupDefaultBalanceMock();
      render(<TestEnhancementPage />);

      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveAttribute("accept", "image/*");
    });

    it("should render upload button disabled when no file selected", () => {
      setupDefaultBalanceMock();
      render(<TestEnhancementPage />);

      const uploadButton = screen.getByRole("button", {
        name: /Upload to R2/i,
      });
      expect(uploadButton).toBeDisabled();
    });

    it("should render tier selection with TIER_2K selected by default", () => {
      setupDefaultBalanceMock();
      render(<TestEnhancementPage />);

      const tier2kRadio = screen.getByDisplayValue("TIER_2K");
      expect(tier2kRadio).toBeChecked();
    });

    it("should display all tier options", () => {
      setupDefaultBalanceMock();
      render(<TestEnhancementPage />);

      expect(screen.getByText(/1K - 2 tokens/)).toBeInTheDocument();
      expect(screen.getByText(/2K - 5 tokens/)).toBeInTheDocument();
      expect(screen.getByText(/4K - 10 tokens/)).toBeInTheDocument();
    });

    it("should have refresh button for token balance", () => {
      setupDefaultBalanceMock();
      render(<TestEnhancementPage />);

      expect(screen.getByRole("button", { name: /Refresh/i }))
        .toBeInTheDocument();
    });
  });

  describe("Token Balance", () => {
    it("should refresh token balance when refresh button is clicked", async () => {
      setupDefaultBalanceMock();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<TestEnhancementPage />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ balance: 75 }),
      });

      const refreshButton = screen.getByRole("button", { name: /Refresh/i });
      await user.click(refreshButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });

    it("should handle token balance fetch error gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(<TestEnhancementPage />);

      // Allow the rejected promise to be processed
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });

      await waitFor(() => {
        expect(mockConsoleError).toHaveBeenCalledWith(
          "Error fetching token balance:",
          expect.any(Error),
        );
      });
    });

    it("should handle non-ok response from token balance API", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Unauthorized" }),
      });

      render(<TestEnhancementPage />);

      // Wait for the fetch to complete
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Token balance should remain as "..." since response was not ok
      expect(screen.getByText(/Token Balance: \.\.\./)).toBeInTheDocument();
    });
  });

  describe("File Selection", () => {
    it("should enable upload button when file is selected", async () => {
      setupDefaultBalanceMock();
      render(<TestEnhancementPage />);

      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      const testFile = new File(["test"], "test.png", { type: "image/png" });

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [testFile] } });
        await vi.advanceTimersByTimeAsync(10);
      });

      const uploadButton = screen.getByRole("button", {
        name: /Upload to R2/i,
      });
      expect(uploadButton).not.toBeDisabled();
    });

    it("should show image preview after file selection", async () => {
      setupDefaultBalanceMock();
      render(<TestEnhancementPage />);

      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      const testFile = new File(["test"], "test.png", { type: "image/png" });

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [testFile] } });
        await vi.advanceTimersByTimeAsync(10);
      });

      await waitFor(() => {
        const previewImg = screen.getByAltText("Preview");
        expect(previewImg).toBeInTheDocument();
        expect(previewImg).toHaveAttribute("src", mockFileReaderResult);
      });
    });

    it("should not do anything if no file is selected", async () => {
      setupDefaultBalanceMock();
      render(<TestEnhancementPage />);

      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [] } });
      });

      const uploadButton = screen.getByRole("button", {
        name: /Upload to R2/i,
      });
      expect(uploadButton).toBeDisabled();
    });

    it("should reset uploaded image and job when new file is selected", async () => {
      // First, set up an uploaded image
      mockFetch.mockReset();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ balance: 50 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              image: {
                id: "img1",
                name: "test.png",
                url: "http://test",
                width: 100,
                height: 100,
              },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ balance: 48 }),
        });

      render(<TestEnhancementPage />);

      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      const testFile = new File(["test"], "test.png", { type: "image/png" });

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [testFile] } });
        await vi.advanceTimersByTimeAsync(10);
      });

      // Upload the image
      const uploadButton = screen.getByRole("button", {
        name: /Upload to R2/i,
      });
      await act(async () => {
        fireEvent.click(uploadButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Uploaded Successfully/)).toBeInTheDocument();
      });

      // Now select a new file
      const newFile = new File(["new"], "new.png", { type: "image/png" });
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [newFile] } });
        await vi.advanceTimersByTimeAsync(10);
      });

      // The uploaded status should be cleared
      expect(screen.queryByText(/Uploaded Successfully/)).not
        .toBeInTheDocument();
    });
  });

  describe("Image Upload", () => {
    it("should upload image successfully", async () => {
      const uploadedImage = {
        id: "img123",
        name: "test.png",
        url: "http://example.com/test.png",
        width: 800,
        height: 600,
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ balance: 50 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ image: uploadedImage }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ balance: 48 }),
        });

      render(<TestEnhancementPage />);

      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      const testFile = new File(["test"], "test.png", { type: "image/png" });

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [testFile] } });
        await vi.advanceTimersByTimeAsync(10);
      });

      const uploadButton = screen.getByRole("button", {
        name: /Upload to R2/i,
      });
      await act(async () => {
        fireEvent.click(uploadButton);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/images/upload", {
          method: "POST",
          body: expect.any(FormData),
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/Uploaded Successfully/)).toBeInTheDocument();
        expect(screen.getByText(/800x600px/)).toBeInTheDocument();
      });
    });

    it("should show uploading state during upload", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ balance: 50 }),
        })
        .mockImplementationOnce(() => new Promise(() => {})); // Never resolves

      render(<TestEnhancementPage />);

      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      const testFile = new File(["test"], "test.png", { type: "image/png" });

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [testFile] } });
        await vi.advanceTimersByTimeAsync(10);
      });

      const uploadButton = screen.getByRole("button", {
        name: /Upload to R2/i,
      });
      await act(async () => {
        fireEvent.click(uploadButton);
      });

      expect(screen.getByRole("button", { name: /Uploading\.\.\./i }))
        .toBeInTheDocument();
    });

    it("should handle upload failure with error response", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ balance: 50 }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: "File too large" }),
        });

      render(<TestEnhancementPage />);

      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      const testFile = new File(["test"], "test.png", { type: "image/png" });

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [testFile] } });
        await vi.advanceTimersByTimeAsync(10);
      });

      const uploadButton = screen.getByRole("button", {
        name: /Upload to R2/i,
      });
      await act(async () => {
        fireEvent.click(uploadButton);
      });

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith("Upload failed: File too large");
      });
    });

    it("should handle upload network error", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ balance: 50 }),
        })
        .mockRejectedValueOnce(new Error("Network error"));

      render(<TestEnhancementPage />);

      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      const testFile = new File(["test"], "test.png", { type: "image/png" });

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [testFile] } });
        await vi.advanceTimersByTimeAsync(10);
      });

      const uploadButton = screen.getByRole("button", {
        name: /Upload to R2/i,
      });
      await act(async () => {
        fireEvent.click(uploadButton);
      });

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          expect.stringContaining("Upload error"),
        );
      });
    });

    it("should disable upload button after successful upload", async () => {
      const uploadedImage = {
        id: "img123",
        name: "test.png",
        url: "http://example.com/test.png",
        width: 800,
        height: 600,
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ balance: 50 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ image: uploadedImage }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ balance: 48 }),
        });

      render(<TestEnhancementPage />);

      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      const testFile = new File(["test"], "test.png", { type: "image/png" });

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [testFile] } });
        await vi.advanceTimersByTimeAsync(10);
      });

      const uploadButton = screen.getByRole("button", {
        name: /Upload to R2/i,
      });
      await act(async () => {
        fireEvent.click(uploadButton);
      });

      await waitFor(() => {
        const updatedButton = screen.getByRole("button", { name: /Uploaded/i });
        expect(updatedButton).toBeDisabled();
      });
    });

    it("should not upload if no file is selected", async () => {
      setupDefaultBalanceMock();
      render(<TestEnhancementPage />);

      // Wait for initial fetch to complete
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // The uploadImage function should return early if !file
      // We can't directly test this since the button is disabled, but we ensure no additional fetch happens
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only the initial token balance fetch
    });
  });

  describe("Tier Selection", () => {
    it("should allow changing tier selection", async () => {
      const uploadedImage = {
        id: "img123",
        name: "test.png",
        url: "http://example.com/test.png",
        width: 800,
        height: 600,
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ balance: 50 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ image: uploadedImage }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ balance: 48 }),
        });

      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<TestEnhancementPage />);

      // First, upload an image to enable tier selection
      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      const testFile = new File(["test"], "test.png", { type: "image/png" });

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [testFile] } });
        await vi.advanceTimersByTimeAsync(10);
      });

      const uploadButton = screen.getByRole("button", {
        name: /Upload to R2/i,
      });
      await act(async () => {
        fireEvent.click(uploadButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Uploaded Successfully/)).toBeInTheDocument();
      });

      // Now tier selection should be enabled
      const tier1kRadio = screen.getByDisplayValue("TIER_1K");
      await user.click(tier1kRadio);

      expect(tier1kRadio).toBeChecked();
    });

    it("should disable tier selection when no image is uploaded", () => {
      setupDefaultBalanceMock();
      render(<TestEnhancementPage />);

      const tier1kRadio = screen.getByDisplayValue(
        "TIER_1K",
      ) as HTMLInputElement;
      expect(tier1kRadio.disabled).toBe(true);
    });

    it("should enable tier selection after image is uploaded", async () => {
      const uploadedImage = {
        id: "img123",
        name: "test.png",
        url: "http://example.com/test.png",
        width: 800,
        height: 600,
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ balance: 50 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ image: uploadedImage }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ balance: 48 }),
        });

      render(<TestEnhancementPage />);

      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      const testFile = new File(["test"], "test.png", { type: "image/png" });

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [testFile] } });
        await vi.advanceTimersByTimeAsync(10);
      });

      const uploadButton = screen.getByRole("button", {
        name: /Upload to R2/i,
      });
      await act(async () => {
        fireEvent.click(uploadButton);
      });

      await waitFor(() => {
        const tier1kRadio = screen.getByDisplayValue(
          "TIER_1K",
        ) as HTMLInputElement;
        expect(tier1kRadio.disabled).toBe(false);
      });
    });
  });

  describe("Image Enhancement", () => {
    const setupUploadedImage = async () => {
      const uploadedImage = {
        id: "img123",
        name: "test.png",
        url: "http://example.com/test.png",
        width: 800,
        height: 600,
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ balance: 50 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ image: uploadedImage }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ balance: 48 }),
        });

      render(<TestEnhancementPage />);

      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      const testFile = new File(["test"], "test.png", { type: "image/png" });

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [testFile] } });
        await vi.advanceTimersByTimeAsync(10);
      });

      const uploadButton = screen.getByRole("button", {
        name: /Upload to R2/i,
      });
      await act(async () => {
        fireEvent.click(uploadButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Uploaded Successfully/)).toBeInTheDocument();
      });
    };

    it("should enhance image successfully and poll for completion", async () => {
      await setupUploadedImage();

      // Mock enhance call and job polling
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ jobId: "job123", newBalance: 43 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ status: "PROCESSING", tier: "TIER_2K" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              status: "COMPLETED",
              tier: "TIER_2K",
              enhancedUrl: "http://example.com/enhanced.png",
              enhancedWidth: 1920,
              enhancedHeight: 1440,
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ balance: 43 }),
        });

      const enhanceButton = screen.getByRole("button", {
        name: /Enhance \(5 tokens\)/i,
      });
      await act(async () => {
        fireEvent.click(enhanceButton);
        // First poll happens immediately after enhanceImage calls pollJobStatus
        await vi.advanceTimersByTimeAsync(50);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/images/enhance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageId: "img123", tier: "TIER_2K" }),
        });
      });

      await waitFor(() => {
        // Text is split across elements - check for PROCESSING text
        expect(screen.getByText("PROCESSING")).toBeInTheDocument();
      });

      // Second poll - COMPLETED (after 2s timeout)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2100);
      });

      await waitFor(() => {
        expect(screen.getByText(/Enhancement Complete!/)).toBeInTheDocument();
      });
    });

    it("should show enhancing state during enhancement", async () => {
      await setupUploadedImage();

      mockFetch.mockImplementationOnce(() => new Promise(() => {})); // Never resolves

      const enhanceButton = screen.getByRole("button", {
        name: /Enhance \(5 tokens\)/i,
      });
      await act(async () => {
        fireEvent.click(enhanceButton);
      });

      expect(screen.getByRole("button", { name: /Enhancing\.\.\./i }))
        .toBeInTheDocument();
    });

    it("should handle enhancement failure", async () => {
      await setupUploadedImage();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Insufficient tokens" }),
      });

      const enhanceButton = screen.getByRole("button", {
        name: /Enhance \(5 tokens\)/i,
      });
      await act(async () => {
        fireEvent.click(enhanceButton);
      });

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          "Enhancement failed: Insufficient tokens",
        );
      });
    });

    it("should handle enhancement network error", async () => {
      await setupUploadedImage();

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const enhanceButton = screen.getByRole("button", {
        name: /Enhance \(5 tokens\)/i,
      });
      await act(async () => {
        fireEvent.click(enhanceButton);
      });

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          expect.stringContaining("Enhancement error"),
        );
      });
    });

    it("should show failed job status", async () => {
      await setupUploadedImage();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ jobId: "job123", newBalance: 43 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              status: "FAILED",
              tier: "TIER_2K",
              errorMessage: "Processing error",
            }),
        });

      const enhanceButton = screen.getByRole("button", {
        name: /Enhance \(5 tokens\)/i,
      });
      await act(async () => {
        fireEvent.click(enhanceButton);
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2100);
      });

      await waitFor(() => {
        // Text is split - "Enhancement failed: " and "Processing error" are separate
        expect(screen.getByText(/Processing error/)).toBeInTheDocument();
        expect(screen.getByText(/Tokens have been refunded/))
          .toBeInTheDocument();
      });
    });

    it("should disable enhance button when token balance is insufficient", async () => {
      const uploadedImage = {
        id: "img123",
        name: "test.png",
        url: "http://example.com/test.png",
        width: 800,
        height: 600,
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ balance: 3 }),
        }) // Low balance
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ image: uploadedImage }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ balance: 3 }),
        });

      render(<TestEnhancementPage />);

      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      const testFile = new File(["test"], "test.png", { type: "image/png" });

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [testFile] } });
        await vi.advanceTimersByTimeAsync(10);
      });

      const uploadButton = screen.getByRole("button", {
        name: /Upload to R2/i,
      });
      await act(async () => {
        fireEvent.click(uploadButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Uploaded Successfully/)).toBeInTheDocument();
      });

      // TIER_2K costs 5 tokens, but we only have 3
      const enhanceButton = screen.getByRole("button", {
        name: /Enhance \(5 tokens\)/i,
      });
      expect(enhanceButton).toBeDisabled();

      // Should show insufficient tokens message - text pattern: "Insufficient tokens. Need 5, have 3"
      expect(screen.getByText(/Insufficient tokens\. Need 5, have 3/))
        .toBeInTheDocument();
    });

    it("should not enhance if no image is uploaded", async () => {
      render(<TestEnhancementPage />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/tokens/balance");
      });

      // Enhance button should be disabled when no image is uploaded
      const enhanceButton = screen.getByRole("button", {
        name: /Enhance \(5 tokens\)/i,
      });
      expect(enhanceButton).toBeDisabled();
    });
  });

  describe("Job Polling", () => {
    const setupForPolling = async () => {
      const uploadedImage = {
        id: "img123",
        name: "test.png",
        url: "http://example.com/test.png",
        width: 800,
        height: 600,
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ balance: 50 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ image: uploadedImage }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ balance: 48 }),
        });

      render(<TestEnhancementPage />);

      // Wait for initial balance fetch to complete
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });

      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      const testFile = new File(["test"], "test.png", { type: "image/png" });

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [testFile] } });
        await vi.advanceTimersByTimeAsync(10);
      });

      const uploadButton = screen.getByRole("button", {
        name: /Upload to R2/i,
      });
      await act(async () => {
        fireEvent.click(uploadButton);
        // Allow upload promise and subsequent balance fetch to resolve
        await vi.advanceTimersByTimeAsync(10);
      });

      await waitFor(() => {
        expect(screen.getByText(/Uploaded Successfully/)).toBeInTheDocument();
      });
    };

    it("should timeout after max polling attempts", async () => {
      await setupForPolling();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ jobId: "job123", newBalance: 43 }),
        });

      // Mock 31 PROCESSING responses (first poll immediate + 30 retries)
      for (let i = 0; i < 31; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ status: "PROCESSING", tier: "TIER_2K" }),
        });
      }

      const enhanceButton = screen.getByRole("button", {
        name: /Enhance \(5 tokens\)/i,
      });
      await act(async () => {
        fireEvent.click(enhanceButton);
        // First poll happens immediately
        await vi.advanceTimersByTimeAsync(50);
      });

      // Advance time for 30 more polling attempts (2 seconds each)
      // Total of 30 attempts triggers maxAttempts check
      for (let i = 0; i < 30; i++) {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(2100);
        });
      }

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith("Job polling timeout");
      });
    });

    it("should handle job polling error and retry", async () => {
      await setupForPolling();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ jobId: "job123", newBalance: 43 }),
        })
        .mockRejectedValueOnce(new Error("Polling error")) // First poll fails immediately
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              status: "COMPLETED",
              tier: "TIER_2K",
              enhancedUrl: "http://example.com/enhanced.png",
              enhancedWidth: 1920,
              enhancedHeight: 1440,
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ balance: 43 }),
        });

      const enhanceButton = screen.getByRole("button", {
        name: /Enhance \(5 tokens\)/i,
      });
      await act(async () => {
        fireEvent.click(enhanceButton);
        // First poll happens immediately and fails
        await vi.advanceTimersByTimeAsync(50);
      });

      expect(mockConsoleError).toHaveBeenCalledWith(
        "Job polling error:",
        expect.any(Error),
      );

      // Second poll happens after 2s retry delay
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2100);
      });

      await waitFor(() => {
        expect(screen.getByText(/Enhancement Complete!/)).toBeInTheDocument();
      });
    });

    it("should display PROCESSING status with spinner", async () => {
      await setupForPolling();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ jobId: "job123", newBalance: 43 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ status: "PROCESSING", tier: "TIER_2K" }),
        });

      const enhanceButton = screen.getByRole("button", {
        name: /Enhance \(5 tokens\)/i,
      });
      await act(async () => {
        fireEvent.click(enhanceButton);
        // Allow the first immediate poll to complete
        await vi.advanceTimersByTimeAsync(50);
      });

      await waitFor(() => {
        expect(screen.getByText("Processing...")).toBeInTheDocument();
      });

      // Check for spinner (animate-spin class)
      const spinner = document.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });
  });

  describe("Job Result Display", () => {
    const setupCompletedJob = async (jobData: {
      status: string;
      tier: string;
      enhancedUrl?: string;
      enhancedWidth?: number;
      enhancedHeight?: number;
      errorMessage?: string;
    }) => {
      const uploadedImage = {
        id: "img123",
        name: "test.png",
        url: "http://example.com/test.png",
        width: 800,
        height: 600,
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ balance: 50 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ image: uploadedImage }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ balance: 48 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ jobId: "job123", newBalance: 43 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(jobData),
        });

      if (jobData.status === "COMPLETED") {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ balance: 43 }),
        });
      }

      render(<TestEnhancementPage />);

      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      const testFile = new File(["test"], "test.png", { type: "image/png" });

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [testFile] } });
        await vi.advanceTimersByTimeAsync(10);
      });

      const uploadButton = screen.getByRole("button", {
        name: /Upload to R2/i,
      });
      await act(async () => {
        fireEvent.click(uploadButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Uploaded Successfully/)).toBeInTheDocument();
      });

      const enhanceButton = screen.getByRole("button", {
        name: /Enhance \(5 tokens\)/i,
      });
      await act(async () => {
        fireEvent.click(enhanceButton);
        // First poll happens immediately after enhanceImage calls pollJobStatus
        await vi.advanceTimersByTimeAsync(50);
      });
    };

    it("should display completed job with enhanced image URL", async () => {
      await setupCompletedJob({
        status: "COMPLETED",
        tier: "TIER_2K",
        enhancedUrl: "http://example.com/enhanced.png",
        enhancedWidth: 1920,
        enhancedHeight: 1440,
      });

      await waitFor(() => {
        expect(screen.getByText(/Enhancement Complete!/)).toBeInTheDocument();
      });

      expect(screen.getByText("Enhanced Image URL:")).toBeInTheDocument();
      expect(screen.getByText("http://example.com/enhanced.png"))
        .toBeInTheDocument();
    });

    it("should display job tier and tokens used", async () => {
      await setupCompletedJob({
        status: "COMPLETED",
        tier: "TIER_2K",
        enhancedUrl: "http://example.com/enhanced.png",
        enhancedWidth: 1920,
        enhancedHeight: 1440,
      });

      await waitFor(() => {
        expect(screen.getByText(/Enhancement Complete!/)).toBeInTheDocument();
      });

      // The text is split across elements, so we check for individual parts
      expect(screen.getByText("Tier:")).toBeInTheDocument();
      expect(screen.getByText("TIER_2K")).toBeInTheDocument();
      expect(screen.getByText("Tokens Used:")).toBeInTheDocument();
    });

    it("should display failed job with error message", async () => {
      await setupCompletedJob({
        status: "FAILED",
        tier: "TIER_2K",
        errorMessage: "AI processing failed",
      });

      await waitFor(() => {
        expect(screen.getByText(/AI processing failed/)).toBeInTheDocument();
      });

      expect(screen.getByText(/Tokens have been refunded/)).toBeInTheDocument();
    });
  });

  describe("Accessibility and Structure", () => {
    it("should have proper heading structure", () => {
      render(<TestEnhancementPage />);

      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "Image Enhancement Demo",
      );
      expect(screen.getByRole("heading", { name: /1\. Upload Image/i }))
        .toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /2\. Enhance Image/i }))
        .toBeInTheDocument();
    });

    it("should have container structure", () => {
      const { container } = render(<TestEnhancementPage />);

      expect(container.querySelector(".container")).toBeInTheDocument();
    });

    it("should have grid layout for cards", () => {
      const { container } = render(<TestEnhancementPage />);

      expect(container.querySelector(".grid")).toBeInTheDocument();
    });
  });
});
