import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { McpToolsClient } from "./McpToolsClient";

const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

// Mock FileReader
class MockFileReader {
  result: string | null = null;
  onload: (() => void) | null = null;
  onerror: ((error: unknown) => void) | null = null;

  readAsDataURL(file: Blob) {
    setTimeout(() => {
      this.result = `data:${file.type};base64,mockbase64data`;
      if (this.onload) this.onload();
    }, 0);
  }
}

global.FileReader = MockFileReader as unknown as typeof FileReader;

describe("McpToolsClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Initial Rendering", () => {
    it("renders the MCP Tools heading", () => {
      render(<McpToolsClient isLoggedIn={false} />);
      expect(screen.getByText("MCP Tools")).toBeDefined();
    });

    it("shows API key required message when not logged in", () => {
      render(<McpToolsClient isLoggedIn={false} />);
      expect(screen.getByText("API Key Required")).toBeDefined();
    });

    it("shows authentication message when logged in", () => {
      render(<McpToolsClient isLoggedIn={true} />);
      expect(screen.getByText("Authentication")).toBeDefined();
    });

    it("shows session authentication success message when logged in", () => {
      render(<McpToolsClient isLoggedIn={true} />);
      expect(
        screen.getByText("Using session authentication (no API key needed)"),
      ).toBeDefined();
    });
  });

  describe("Generate Tab", () => {
    it("disables generate button when prompt is empty", () => {
      render(<McpToolsClient isLoggedIn={true} />);

      const generateButton = screen.getAllByText("Generate").find(
        (el) => el.closest("button") !== null,
      );
      expect(generateButton?.closest("button")?.disabled).toBe(true);
    });

    it("enables generate button when prompt is provided", () => {
      render(<McpToolsClient isLoggedIn={true} />);

      const promptTextarea = screen.getByPlaceholderText(
        /A serene mountain landscape/,
      );
      fireEvent.change(promptTextarea, {
        target: { value: "A beautiful sunset" },
      });

      const generateButton = screen.getAllByText("Generate").find(
        (el) => el.closest("button") !== null,
      );
      expect(generateButton?.closest("button")?.disabled).toBe(false);
    });

    it("shows generating state when generate is clicked", async () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      render(<McpToolsClient isLoggedIn={true} />);

      const promptTextarea = screen.getByPlaceholderText(
        /A serene mountain landscape/,
      );
      fireEvent.change(promptTextarea, {
        target: { value: "A beautiful sunset" },
      });

      const generateButton = screen.getAllByText("Generate").find(
        (el) => el.closest("button") !== null,
      ) as HTMLElement;
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText("Generating...")).toBeDefined();
      });
    });

    it("handles successful image generation with polling", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ jobId: "job_123" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              id: "job_123",
              status: "COMPLETED",
              outputImageUrl: "https://example.com/image.png",
              outputWidth: 1024,
              outputHeight: 1024,
              tokensCost: 2,
            }),
        });

      render(<McpToolsClient isLoggedIn={true} />);

      const promptTextarea = screen.getByPlaceholderText(
        /A serene mountain landscape/,
      );
      fireEvent.change(promptTextarea, {
        target: { value: "A beautiful sunset" },
      });

      const generateButton = screen.getAllByText("Generate").find(
        (el) => el.closest("button") !== null,
      ) as HTMLElement;
      fireEvent.click(generateButton);

      await waitFor(
        () => {
          expect(screen.getByText(/Job ID:/)).toBeDefined();
        },
        { timeout: 3000 },
      );
    });

    it("handles failed job status during polling", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ jobId: "job_456" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              id: "job_456",
              status: "FAILED",
              errorMessage: "AI generation failed",
            }),
        });

      render(<McpToolsClient isLoggedIn={true} />);

      const promptTextarea = screen.getByPlaceholderText(
        /A serene mountain landscape/,
      );
      fireEvent.change(promptTextarea, {
        target: { value: "A beautiful sunset" },
      });

      const generateButton = screen.getAllByText("Generate").find(
        (el) => el.closest("button") !== null,
      ) as HTMLElement;
      fireEvent.click(generateButton);

      await waitFor(
        () => {
          expect(screen.getByText(/AI generation failed/)).toBeDefined();
        },
        { timeout: 3000 },
      );
    });

    it("handles refunded job status during polling", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ jobId: "job_789" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              id: "job_789",
              status: "REFUNDED",
              errorMessage: "Job was refunded",
            }),
        });

      render(<McpToolsClient isLoggedIn={true} />);

      const promptTextarea = screen.getByPlaceholderText(
        /A serene mountain landscape/,
      );
      fireEvent.change(promptTextarea, {
        target: { value: "A beautiful sunset" },
      });

      const generateButton = screen.getAllByText("Generate").find(
        (el) => el.closest("button") !== null,
      ) as HTMLElement;
      fireEvent.click(generateButton);

      await waitFor(
        () => {
          expect(screen.getByText(/Job was refunded/)).toBeDefined();
        },
        { timeout: 3000 },
      );
    });
  });

  describe("Modify Tab", () => {
    it("disables modify button when no image is uploaded", async () => {
      render(<McpToolsClient isLoggedIn={true} />);

      const modifyTab = screen.getByText("Modify");
      fireEvent.click(modifyTab);

      await waitFor(() => {
        const modifyButton = screen.getAllByText("Modify").find(
          (el) => el.closest("button") !== null,
        );
        expect(modifyButton?.closest("button")?.disabled).toBe(true);
      });
    });

    it("enables modify button when prompt and image are provided", async () => {
      render(<McpToolsClient isLoggedIn={true} />);

      const modifyTab = screen.getByText("Modify");
      fireEvent.click(modifyTab);

      await waitFor(() => {
        const promptTextarea = screen.getByPlaceholderText(/Add a rainbow/);
        fireEvent.change(promptTextarea, {
          target: { value: "Add stars to the sky" },
        });

        const file = new File(["dummy content"], "test.png", {
          type: "image/png",
        });
        const fileInput = screen.getByLabelText("Upload Image");
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        const modifyButton = screen.getAllByText("Modify").find(
          (el) => el.closest("button") !== null,
        );
        expect(modifyButton?.closest("button")?.disabled).toBe(false);
      });
    });

    it("handles successful image modification", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ jobId: "mod_job_123" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              id: "mod_job_123",
              status: "COMPLETED",
              outputImageUrl: "https://example.com/modified.png",
              outputWidth: 2048,
              outputHeight: 2048,
              tokensCost: 5,
            }),
        });

      render(<McpToolsClient isLoggedIn={true} />);

      const modifyTab = screen.getByText("Modify");
      fireEvent.click(modifyTab);

      await waitFor(() => {
        const promptTextarea = screen.getByPlaceholderText(/Add a rainbow/);
        fireEvent.change(promptTextarea, {
          target: { value: "Add stars to the sky" },
        });

        const file = new File(["dummy content"], "test.png", {
          type: "image/png",
        });
        const fileInput = screen.getByLabelText("Upload Image");
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        const modifyButton = screen.getAllByText("Modify").find(
          (el) => el.closest("button") !== null,
        ) as HTMLElement;
        fireEvent.click(modifyButton);
      });

      await waitFor(
        () => {
          expect(screen.getByText(/Job ID:/)).toBeDefined();
        },
        { timeout: 3000 },
      );
    });
  });

  describe("Job Status Tab", () => {
    it("disables check status button when job ID is empty", async () => {
      render(<McpToolsClient isLoggedIn={true} />);

      const statusTab = screen.getByText("Job Status");
      fireEvent.click(statusTab);

      await waitFor(() => {
        const checkButton = screen.getByText("Check Status");
        expect(checkButton.closest("button")?.disabled).toBe(true);
      });
    });

    it("enables check status button when job ID is provided", async () => {
      render(<McpToolsClient isLoggedIn={true} />);

      const statusTab = screen.getByText("Job Status");
      fireEvent.click(statusTab);

      await waitFor(() => {
        const jobIdInput = screen.getByPlaceholderText(/cm4xxxxx/);
        fireEvent.change(jobIdInput, { target: { value: "job_test_123" } });
      });

      await waitFor(() => {
        const checkButton = screen.getByText("Check Status");
        expect(checkButton.closest("button")?.disabled).toBe(false);
      });
    });

    it("handles successful job status check", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "job_test_123",
            type: "GENERATE",
            tier: "TIER_1K",
            tokensCost: 2,
            status: "COMPLETED",
            prompt: "Test prompt",
            outputImageUrl: "https://example.com/result.png",
            outputWidth: 1024,
            outputHeight: 1024,
          }),
      });

      render(<McpToolsClient isLoggedIn={true} />);

      const statusTab = screen.getByText("Job Status");
      fireEvent.click(statusTab);

      await waitFor(() => {
        const jobIdInput = screen.getByPlaceholderText(/cm4xxxxx/);
        fireEvent.change(jobIdInput, { target: { value: "job_test_123" } });
      });

      await waitFor(() => {
        const checkButton = screen.getByText("Check Status");
        fireEvent.click(checkButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Test prompt/)).toBeDefined();
      });
    });

    it("handles job status check error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Job not found" }),
      });

      render(<McpToolsClient isLoggedIn={true} />);

      const statusTab = screen.getByText("Job Status");
      fireEvent.click(statusTab);

      await waitFor(() => {
        const jobIdInput = screen.getByPlaceholderText(/cm4xxxxx/);
        fireEvent.change(jobIdInput, { target: { value: "invalid_job" } });
      });

      await waitFor(() => {
        const checkButton = screen.getByText("Check Status");
        fireEvent.click(checkButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Job not found/)).toBeDefined();
      });
    });
  });

  describe("Balance Tab", () => {
    it("disables check balance button when not logged in and no API key", async () => {
      render(<McpToolsClient isLoggedIn={false} />);

      const balanceTab = screen.getByText("Balance");
      fireEvent.click(balanceTab);

      await waitFor(() => {
        const checkButton = screen.getByText("Check Balance");
        expect(checkButton.closest("button")?.disabled).toBe(true);
      });
    });

    it("enables check balance button when logged in", async () => {
      render(<McpToolsClient isLoggedIn={true} />);

      const balanceTab = screen.getByText("Balance");
      fireEvent.click(balanceTab);

      await waitFor(() => {
        const checkButton = screen.getByText("Check Balance");
        expect(checkButton.closest("button")?.disabled).toBe(false);
      });
    });

    it("handles successful balance check", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ balance: 42 }),
      });

      render(<McpToolsClient isLoggedIn={true} />);

      const balanceTab = screen.getByText("Balance");
      fireEvent.click(balanceTab);

      await waitFor(() => {
        const checkButton = screen.getByText("Check Balance");
        fireEvent.click(checkButton);
      });

      await waitFor(() => {
        expect(screen.getByText("42")).toBeDefined();
        expect(screen.getByText("tokens available")).toBeDefined();
      });
    });

    it("handles balance check error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Unauthorized" }),
      });

      render(<McpToolsClient isLoggedIn={true} />);

      const balanceTab = screen.getByText("Balance");
      fireEvent.click(balanceTab);

      await waitFor(() => {
        const checkButton = screen.getByText("Check Balance");
        fireEvent.click(checkButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Unauthorized/)).toBeDefined();
      });
    });
  });

  describe("API Key Management", () => {
    it("allows entering manual API key when logged in", () => {
      render(<McpToolsClient isLoggedIn={true} />);

      const apiKeyInput = screen.getByPlaceholderText(
        /sk_live_.*leave empty to use session/,
      );
      fireEvent.change(apiKeyInput, { target: { value: "sk_live_test123" } });

      expect(apiKeyInput).toHaveProperty("value", "sk_live_test123");
    });

    it("requires API key when not logged in", () => {
      render(<McpToolsClient isLoggedIn={false} />);

      const apiKeyInput = screen.getByPlaceholderText(/sk_live_.../);
      expect(apiKeyInput).toBeDefined();
    });
  });

  describe("Clipboard Functionality", () => {
    it("copies curl command to clipboard", async () => {
      render(<McpToolsClient isLoggedIn={true} />);

      const copyButtons = document.querySelectorAll('button[type="button"]');
      const copyButton = Array.from(copyButtons).find((btn) =>
        btn.querySelector(".lucide-copy")
      );

      if (copyButton) {
        fireEvent.click(copyButton);

        await waitFor(() => {
          expect(navigator.clipboard.writeText).toHaveBeenCalled();
        });
      }
    });
  });

  describe("Tier Selection", () => {
    it("displays tier costs correctly", () => {
      render(<McpToolsClient isLoggedIn={true} />);

      expect(screen.getByText("Cost: 2 tokens")).toBeDefined();
    });

    it("updates cost when tier is changed", async () => {
      render(<McpToolsClient isLoggedIn={true} />);

      const tierSelect = screen.getAllByRole("combobox")[0];
      fireEvent.click(tierSelect);

      await waitFor(() => {
        const tier2k = screen.getByText(/2K \(2048px\) - 5 tokens/);
        fireEvent.click(tier2k);
      });

      await waitFor(() => {
        expect(screen.getByText("Cost: 5 tokens")).toBeDefined();
      });
    });
  });

  describe("Status Badges", () => {
    it("shows completed badge for completed jobs", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "job_123",
            type: "GENERATE",
            tier: "TIER_1K",
            tokensCost: 2,
            status: "COMPLETED",
            prompt: "Test",
          }),
      });

      render(<McpToolsClient isLoggedIn={true} />);

      const statusTab = screen.getByText("Job Status");
      fireEvent.click(statusTab);

      await waitFor(() => {
        const jobIdInput = screen.getByPlaceholderText(/cm4xxxxx/);
        fireEvent.change(jobIdInput, { target: { value: "job_123" } });
        const checkButton = screen.getByText("Check Status");
        fireEvent.click(checkButton);
      });

      await waitFor(() => {
        expect(screen.getByText("Completed")).toBeDefined();
      });
    });

    it("shows failed badge for failed jobs", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "job_456",
            type: "GENERATE",
            tier: "TIER_1K",
            tokensCost: 2,
            status: "FAILED",
            prompt: "Test",
            errorMessage: "Processing error",
          }),
      });

      render(<McpToolsClient isLoggedIn={true} />);

      const statusTab = screen.getByText("Job Status");
      fireEvent.click(statusTab);

      await waitFor(() => {
        const jobIdInput = screen.getByPlaceholderText(/cm4xxxxx/);
        fireEvent.change(jobIdInput, { target: { value: "job_456" } });
        const checkButton = screen.getByText("Check Status");
        fireEvent.click(checkButton);
      });

      await waitFor(() => {
        expect(screen.getByText("Failed")).toBeDefined();
      });
    });
  });

  describe("Polling Logic", () => {
    it("polls job status until completion", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ jobId: "job_poll_123" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              id: "job_poll_123",
              status: "PROCESSING",
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              id: "job_poll_123",
              status: "COMPLETED",
              outputImageUrl: "https://example.com/final.png",
              outputWidth: 1024,
              outputHeight: 1024,
              tokensCost: 2,
            }),
        });

      render(<McpToolsClient isLoggedIn={true} />);

      const promptTextarea = screen.getByPlaceholderText(
        /A serene mountain landscape/,
      );
      fireEvent.change(promptTextarea, {
        target: { value: "Test polling" },
      });

      const generateButton = screen.getAllByText("Generate").find(
        (el) => el.closest("button") !== null,
      ) as HTMLElement;
      fireEvent.click(generateButton);

      await waitFor(
        () => {
          expect(screen.getByText(/Job ID:/)).toBeDefined();
        },
        { timeout: 5000 },
      );
    });
  });

  describe("Error Handling", () => {
    it("shows error when API request fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Request failed" }),
      });

      render(<McpToolsClient isLoggedIn={true} />);

      const promptTextarea = screen.getByPlaceholderText(
        /A serene mountain landscape/,
      );
      fireEvent.change(promptTextarea, {
        target: { value: "Test error" },
      });

      const generateButton = screen.getAllByText("Generate").find(
        (el) => el.closest("button") !== null,
      ) as HTMLElement;
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/Request failed/)).toBeDefined();
      });
    });

    it("shows error when not logged in and no API key provided", async () => {
      render(<McpToolsClient isLoggedIn={false} />);

      const promptTextarea = screen.getByPlaceholderText(
        /A serene mountain landscape/,
      );
      fireEvent.change(promptTextarea, {
        target: { value: "Test without auth" },
      });

      const generateButton = screen.getAllByText("Generate").find(
        (el) => el.closest("button") !== null,
      ) as HTMLElement;
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Please enter an API key to test the API/),
        ).toBeDefined();
      });
    });
  });
});
