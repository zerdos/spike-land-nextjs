/**
 * Tests for ImageGenerationDialog
 * Part of #843: AI Image Generation for Posts
 */

import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import type { BrandProfileFormData } from "@/lib/validations/brand-brain";

import { ImageGenerationDialog } from "./ImageGenerationDialog";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("ImageGenerationDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    workspaceId: "test-workspace",
    onImageGenerated: vi.fn(),
  };

  const mockBrandProfile: BrandProfileFormData = {
    name: "Test Brand",
    toneDescriptors: {
      formalCasual: 70,
      technicalSimple: 70,
      seriousPlayful: 70,
      reservedEnthusiastic: 70,
    },
    colorPalette: [{ name: "Blue", hex: "#0066CC" }],
    values: ["innovation"],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders dialog when open", () => {
      render(<ImageGenerationDialog {...defaultProps} />);

      expect(screen.getByTestId("image-generation-dialog")).toBeInTheDocument();
      expect(screen.getByText("Generate Image")).toBeInTheDocument();
      expect(screen.getByTestId("prompt-input")).toBeInTheDocument();
    });

    it("does not render when closed", () => {
      render(<ImageGenerationDialog {...defaultProps} open={false} />);

      expect(screen.queryByTestId("image-generation-dialog")).not.toBeInTheDocument();
    });

    it("renders all form fields", () => {
      render(<ImageGenerationDialog {...defaultProps} />);

      expect(screen.getByTestId("prompt-input")).toBeInTheDocument();
      expect(screen.getByTestId("negative-prompt-input")).toBeInTheDocument();
      expect(screen.getByTestId("tier-select")).toBeInTheDocument();
      expect(screen.getByTestId("aspect-ratio-select")).toBeInTheDocument();
      expect(screen.getByTestId("brand-voice-toggle")).toBeInTheDocument();
      expect(screen.getByTestId("generate-button")).toBeInTheDocument();
    });

    it("shows token cost for selected tier", () => {
      render(<ImageGenerationDialog {...defaultProps} />);

      // Default tier is TIER_1K which costs 2 tokens
      expect(screen.getByText("Cost: 2 tokens")).toBeInTheDocument();
    });
  });

  describe("Form Interaction", () => {
    it("allows entering prompt text", () => {
      render(<ImageGenerationDialog {...defaultProps} />);

      const promptInput = screen.getByTestId("prompt-input");
      fireEvent.change(promptInput, { target: { value: "A beautiful sunset" } });

      expect(promptInput).toHaveValue("A beautiful sunset");
    });

    it("0", () => {
      
      render(<ImageGenerationDialog {...defaultProps} />);

      const promptInput = screen.getByTestId("prompt-input");
      fireEvent.change(promptInput, { target: { value: "Test prompt" } });

      expect(screen.getByText(/11 \/ 4000 characters/)).toBeInTheDocument();
    });

    it("0", () => {
      
      render(<ImageGenerationDialog {...defaultProps} />);

      const negativePromptInput = screen.getByTestId("negative-prompt-input");
      fireEvent.change(negativePromptInput, { target: { value: "blurry, low quality" } });

      expect(negativePromptInput).toHaveValue("blurry, low quality");
    });

    it("0", () => {
      
      render(<ImageGenerationDialog {...defaultProps} />);

      const tierSelect = screen.getByTestId("tier-select");
      fireEvent.click(tierSelect);

      const tier2kOption = screen.getByText(/High \(2048px\) - 5 tokens/);
      fireEvent.click(tier2kOption);

      // Cost should update
      expect(screen.getByText("Cost: 5 tokens")).toBeInTheDocument();
    });

    it("0", () => {
      
      render(<ImageGenerationDialog {...defaultProps} />);

      const aspectRatioSelect = screen.getByTestId("aspect-ratio-select");
      fireEvent.click(aspectRatioSelect);

      const ratio16x9 = screen.getByText("Landscape 16:9");
      fireEvent.click(ratio16x9);

      // Check value was set (value will be in the DOM)
      expect(aspectRatioSelect).toBeInTheDocument();
    });
  });

  describe("Brand Voice Integration", () => {
    it("disables brand voice toggle when no brand profile", () => {
      render(<ImageGenerationDialog {...defaultProps} brandProfile={null} />);

      const toggle = screen.getByTestId("brand-voice-toggle");
      expect(toggle).toBeDisabled();
      expect(screen.getByText("Configure Brand Brain to enable")).toBeInTheDocument();
    });

    it("enables brand voice toggle when brand profile exists", () => {
      render(<ImageGenerationDialog {...defaultProps} brandProfile={mockBrandProfile} />);

      const toggle = screen.getByTestId("brand-voice-toggle");
      expect(toggle).not.toBeDisabled();
      expect(screen.getByText("Enhance prompt with brand settings")).toBeInTheDocument();
    });

    it("0", () => {
      
      render(<ImageGenerationDialog {...defaultProps} brandProfile={mockBrandProfile} />);

      const toggle = screen.getByTestId("brand-voice-toggle");
      expect(toggle).not.toBeChecked();

      fireEvent.click(toggle);
      expect(toggle).toBeChecked();
    });
  });

  describe("Validation", () => {
    it("0", () => {
      
      render(<ImageGenerationDialog {...defaultProps} />);

      const generateButton = screen.getByTestId("generate-button");
      fireEvent.click(generateButton);

      expect(screen.getByText("Please enter a prompt")).toBeInTheDocument();
    });

    it("0", () => {
      
      render(<ImageGenerationDialog {...defaultProps} />);

      const promptInput = screen.getByTestId("prompt-input");
      const longPrompt = "a".repeat(4001);

      // Type a very long prompt
      fireEvent.change(promptInput, { target: { value: longPrompt } });

      const generateButton = screen.getByTestId("generate-button");
      fireEvent.click(generateButton);

      expect(screen.getByText(/Prompt must be 4000 characters or less/)).toBeInTheDocument();
    });

    it("disables generate button when prompt is empty", () => {
      render(<ImageGenerationDialog {...defaultProps} />);

      const generateButton = screen.getByTestId("generate-button");
      expect(generateButton).toBeDisabled();
    });

    it("0", () => {
      
      render(<ImageGenerationDialog {...defaultProps} />);

      const promptInput = screen.getByTestId("prompt-input");
      fireEvent.change(promptInput, { target: { value: "A test prompt" } });

      const generateButton = screen.getByTestId("generate-button");
      expect(generateButton).not.toBeDisabled();
    });
  });

  describe("API Integration", () => {
    it("0", () => {
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, jobId: "test-job-123", tokensCost: 2 }),
      });

      render(<ImageGenerationDialog {...defaultProps} />);

      const promptInput = screen.getByTestId("prompt-input");
      fireEvent.change(promptInput, { target: { value: "A beautiful sunset" } });

      const generateButton = screen.getByTestId("generate-button");
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/mcp/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: "A beautiful sunset",
            tier: "TIER_1K",
            aspectRatio: "1:1",
          }),
        });
      });
    });

    it("0", () => {
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, jobId: "test-job-123", tokensCost: 2 }),
      });

      render(<ImageGenerationDialog {...defaultProps} brandProfile={mockBrandProfile} />);

      const promptInput = screen.getByTestId("prompt-input");
      fireEvent.change(promptInput, { target: { value: "A modern office" } });

      const toggle = screen.getByTestId("brand-voice-toggle");
      fireEvent.click(toggle);

      const generateButton = screen.getByTestId("generate-button");
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
        const callArgs = mockFetch.mock.calls[0];
        if (!callArgs) throw new Error("No call args");
        const body = JSON.parse(callArgs[1].body);
        // Should contain enriched prompt with brand attributes
        expect(body.prompt).toContain("A modern office");
        expect(body.prompt).toContain("Style:");
      });
    });

    it("0", () => {
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, jobId: "test-job-123", tokensCost: 2 }),
      });

      render(<ImageGenerationDialog {...defaultProps} />);

      const promptInput = screen.getByTestId("prompt-input");
      fireEvent.change(promptInput, { target: { value: "A sunset" } });

      const negativePromptInput = screen.getByTestId("negative-prompt-input");
      fireEvent.change(negativePromptInput, { target: { value: "blurry" } });

      const generateButton = screen.getByTestId("generate-button");
      fireEvent.click(generateButton);

      await waitFor(() => {
        const callArgs = mockFetch.mock.calls[0];
        if (!callArgs) throw new Error("No call args");
        const body = JSON.parse(callArgs[1].body);
        expect(body.negativePrompt).toBe("blurry");
      });
    });

    it("0", () => {
      
      const onImageGenerated = vi.fn();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, jobId: "test-job-123", tokensCost: 2 }),
      });

      render(<ImageGenerationDialog {...defaultProps} onImageGenerated={onImageGenerated} />);

      const promptInput = screen.getByTestId("prompt-input");
      fireEvent.change(promptInput, { target: { value: "A sunset" } });

      const generateButton = screen.getByTestId("generate-button");
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(onImageGenerated).toHaveBeenCalledWith("test-job-123");
      });
    });

    it("0", () => {
      
      const onOpenChange = vi.fn();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, jobId: "test-job-123", tokensCost: 2 }),
      });

      render(<ImageGenerationDialog {...defaultProps} onOpenChange={onOpenChange} />);

      const promptInput = screen.getByTestId("prompt-input");
      fireEvent.change(promptInput, { target: { value: "A sunset" } });

      const generateButton = screen.getByTestId("generate-button");
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe("Error Handling", () => {
    it("0", () => {
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 402,
        json: async () => ({ error: "Insufficient tokens" }),
      });

      render(<ImageGenerationDialog {...defaultProps} />);

      const promptInput = screen.getByTestId("prompt-input");
      fireEvent.change(promptInput, { target: { value: "A sunset" } });

      const generateButton = screen.getByTestId("generate-button");
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/Insufficient tokens/)).toBeInTheDocument();
      });
    });

    it("0", () => {
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: "Rate limit exceeded", retryAfter: 60 }),
      });

      render(<ImageGenerationDialog {...defaultProps} />);

      const promptInput = screen.getByTestId("prompt-input");
      fireEvent.change(promptInput, { target: { value: "A sunset" } });

      const generateButton = screen.getByTestId("generate-button");
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/Rate limit exceeded.*60 seconds/)).toBeInTheDocument();
      });
    });

    it("0", () => {
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: "Internal server error" }),
      });

      render(<ImageGenerationDialog {...defaultProps} />);

      const promptInput = screen.getByTestId("prompt-input");
      fireEvent.change(promptInput, { target: { value: "A sunset" } });

      const generateButton = screen.getByTestId("generate-button");
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText("Internal server error")).toBeInTheDocument();
      });
    });

    it("0", () => {
      
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(<ImageGenerationDialog {...defaultProps} />);

      const promptInput = screen.getByTestId("prompt-input");
      fireEvent.change(promptInput, { target: { value: "A sunset" } });

      const generateButton = screen.getByTestId("generate-button");
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText("Network error. Please try again.")).toBeInTheDocument();
      });
    });
  });

  describe("Loading State", () => {
    it("0", () => {
      
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<ImageGenerationDialog {...defaultProps} />);

      const promptInput = screen.getByTestId("prompt-input");
      fireEvent.change(promptInput, { target: { value: "A sunset" } });

      const generateButton = screen.getByTestId("generate-button");
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText("Generating...")).toBeInTheDocument();
      });
    });

    it("0", () => {
      
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<ImageGenerationDialog {...defaultProps} />);

      const promptInput = screen.getByTestId("prompt-input");
      fireEvent.change(promptInput, { target: { value: "A sunset" } });

      const generateButton = screen.getByTestId("generate-button");
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(generateButton).toBeDisabled();
        expect(screen.getByText("Cancel")).toBeDisabled();
      });
    });
  });

  describe("Form Reset", () => {
    it("0", () => {
      
      const { rerender } = render(<ImageGenerationDialog {...defaultProps} />);

      const promptInput = screen.getByTestId("prompt-input");
      fireEvent.change(promptInput, { target: { value: "Test prompt" } });

      // Close dialog
      rerender(<ImageGenerationDialog {...defaultProps} open={false} />);

      // Reopen dialog
      rerender(<ImageGenerationDialog {...defaultProps} open={true} />);

      // Form should be reset
      expect(screen.getByTestId("prompt-input")).toHaveValue("");
    });
  });
});
