/**
 * Tests for ImageEnhancementDialog
 * Part of #843: AI Image Generation for Posts
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import type { BrandProfileFormData } from "@/lib/validations/brand-brain";

import { ImageEnhancementDialog } from "./ImageEnhancementDialog";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("ImageEnhancementDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    workspaceId: "test-workspace",
    imageUrl: "https://example.com/test-image.jpg",
    onImageEnhanced: vi.fn(),
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
      render(<ImageEnhancementDialog {...defaultProps} />);

      expect(screen.getByTestId("image-enhancement-dialog")).toBeInTheDocument();
      expect(screen.getByText("Enhance Image")).toBeInTheDocument();
      expect(screen.getByTestId("enhancement-prompt-input")).toBeInTheDocument();
    });

    it("does not render when closed", () => {
      render(<ImageEnhancementDialog {...defaultProps} open={false} />);

      expect(screen.queryByTestId("image-enhancement-dialog")).not.toBeInTheDocument();
    });

    it("renders all form fields", () => {
      render(<ImageEnhancementDialog {...defaultProps} />);

      expect(screen.getByTestId("enhancement-prompt-input")).toBeInTheDocument();
      expect(screen.getByTestId("tier-select")).toBeInTheDocument();
      expect(screen.getByTestId("brand-voice-toggle")).toBeInTheDocument();
      expect(screen.getByTestId("enhance-button")).toBeInTheDocument();
    });

    it("shows image preview when imageUrl provided", () => {
      render(<ImageEnhancementDialog {...defaultProps} />);

      const imagePreview = screen.getByTestId("image-preview");
      expect(imagePreview).toBeInTheDocument();
      expect(imagePreview).toHaveAttribute("src", "https://example.com/test-image.jpg");
    });

    it("does not show image preview when only base64 provided", () => {
      render(
        <ImageEnhancementDialog
          {...defaultProps}
          imageUrl={undefined}
          imageBase64="base64data"
          imageMimeType="image/jpeg"
        />
      );

      expect(screen.queryByTestId("image-preview")).not.toBeInTheDocument();
    });

    it("shows token cost for selected tier", () => {
      render(<ImageEnhancementDialog {...defaultProps} />);

      // Default tier is TIER_1K which costs 2 tokens
      expect(screen.getByText("Cost: 2 tokens")).toBeInTheDocument();
    });
  });

  describe("Form Interaction", () => {
    it("0", () => {
      
      render(<ImageEnhancementDialog {...defaultProps} />);

      const promptInput = screen.getByTestId("enhancement-prompt-input");
      fireEvent.change(promptInput, { target: { value: "Make it brighter" } });

      expect(promptInput).toHaveValue("Make it brighter");
    });

    it("0", () => {
      
      render(<ImageEnhancementDialog {...defaultProps} />);

      const promptInput = screen.getByTestId("enhancement-prompt-input");
      fireEvent.change(promptInput, { target: { value: "Test enhancement" } });

      expect(screen.getByText(/16 \/ 4000 characters/)).toBeInTheDocument();
    });

    it("0", () => {
      
      render(<ImageEnhancementDialog {...defaultProps} />);

      const tierSelect = screen.getByTestId("tier-select");
      fireEvent.click(tierSelect);

      const tier2kOption = screen.getByText(/High \(2048px\) - 5 tokens/);
      fireEvent.click(tier2kOption);

      // Cost should update
      expect(screen.getByText("Cost: 5 tokens")).toBeInTheDocument();
    });
  });

  describe("Brand Voice Integration", () => {
    it("disables brand voice toggle when no brand profile", () => {
      render(<ImageEnhancementDialog {...defaultProps} brandProfile={null} />);

      const toggle = screen.getByTestId("brand-voice-toggle");
      expect(toggle).toBeDisabled();
      expect(screen.getByText("Configure Brand Brain to enable")).toBeInTheDocument();
    });

    it("enables brand voice toggle when brand profile exists", () => {
      render(<ImageEnhancementDialog {...defaultProps} brandProfile={mockBrandProfile} />);

      const toggle = screen.getByTestId("brand-voice-toggle");
      expect(toggle).not.toBeDisabled();
      expect(screen.getByText("Enhance prompt with brand settings")).toBeInTheDocument();
    });

    it("0", () => {
      
      render(<ImageEnhancementDialog {...defaultProps} brandProfile={mockBrandProfile} />);

      const toggle = screen.getByTestId("brand-voice-toggle");
      expect(toggle).not.toBeChecked();

      fireEvent.click(toggle);
      expect(toggle).toBeChecked();
    });
  });

  describe("Validation", () => {
    it("0", () => {
      
      render(
        <ImageEnhancementDialog
          {...defaultProps}
          imageUrl={undefined}
          imageBase64={undefined}
        />
      );

      const promptInput = screen.getByTestId("enhancement-prompt-input");
      fireEvent.change(promptInput, { target: { value: "Test prompt" } });

      const enhanceButton = screen.getByTestId("enhance-button");
      fireEvent.click(enhanceButton);

      expect(screen.getByText("No image provided")).toBeInTheDocument();
    });

    it("0", () => {
      
      render(<ImageEnhancementDialog {...defaultProps} />);

      const enhanceButton = screen.getByTestId("enhance-button");
      fireEvent.click(enhanceButton);

      expect(screen.getByText("Please enter enhancement instructions")).toBeInTheDocument();
    });

    it("0", () => {
      
      render(<ImageEnhancementDialog {...defaultProps} />);

      const promptInput = screen.getByTestId("enhancement-prompt-input");
      const longPrompt = "a".repeat(4001);

      fireEvent.change(promptInput, { target: { value: longPrompt } });

      const enhanceButton = screen.getByTestId("enhance-button");
      fireEvent.click(enhanceButton);

      expect(screen.getByText(/Prompt must be 4000 characters or less/)).toBeInTheDocument();
    });

    it("0", () => {
      
      render(
        <ImageEnhancementDialog
          {...defaultProps}
          imageUrl={undefined}
          imageBase64="base64data"
          imageMimeType={undefined}
        />
      );

      const promptInput = screen.getByTestId("enhancement-prompt-input");
      fireEvent.change(promptInput, { target: { value: "Test prompt" } });

      const enhanceButton = screen.getByTestId("enhance-button");
      fireEvent.click(enhanceButton);

      expect(screen.getByText("Image MIME type is required for base64 images")).toBeInTheDocument();
    });

    it("disables enhance button when prompt is empty", () => {
      render(<ImageEnhancementDialog {...defaultProps} />);

      const enhanceButton = screen.getByTestId("enhance-button");
      expect(enhanceButton).toBeDisabled();
    });

    it("disables enhance button when no image", () => {
      render(
        <ImageEnhancementDialog
          {...defaultProps}
          imageUrl={undefined}
          imageBase64={undefined}
        />
      );

      const enhanceButton = screen.getByTestId("enhance-button");
      expect(enhanceButton).toBeDisabled();
    });

    it("0", () => {
      
      render(<ImageEnhancementDialog {...defaultProps} />);

      const promptInput = screen.getByTestId("enhancement-prompt-input");
      fireEvent.change(promptInput, { target: { value: "Test prompt" } });

      const enhanceButton = screen.getByTestId("enhance-button");
      expect(enhanceButton).not.toBeDisabled();
    });
  });

  describe("API Integration", () => {
    it("0", () => {
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, jobId: "test-job-123", tokensCost: 2 }),
      });

      render(<ImageEnhancementDialog {...defaultProps} />);

      const promptInput = screen.getByTestId("enhancement-prompt-input");
      fireEvent.change(promptInput, { target: { value: "Make it brighter" } });

      const enhanceButton = screen.getByTestId("enhance-button");
      fireEvent.click(enhanceButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/mcp/modify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: "Make it brighter",
            tier: "TIER_1K",
            imageUrl: "https://example.com/test-image.jpg",
          }),
        });
      });
    });

    it("0", () => {
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, jobId: "test-job-123", tokensCost: 2 }),
      });

      render(
        <ImageEnhancementDialog
          {...defaultProps}
          imageUrl={undefined}
          imageBase64="base64imagedata"
          imageMimeType="image/jpeg"
        />
      );

      const promptInput = screen.getByTestId("enhancement-prompt-input");
      fireEvent.change(promptInput, { target: { value: "Make it brighter" } });

      const enhanceButton = screen.getByTestId("enhance-button");
      fireEvent.click(enhanceButton);

      await waitFor(() => {
        const callArgs = mockFetch.mock.calls[0];
        if (!callArgs) throw new Error("No call args");
        const body = JSON.parse(callArgs[1].body);
        expect(body.image).toBe("base64imagedata");
        expect(body.mimeType).toBe("image/jpeg");
      });
    });

    it("0", () => {
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, jobId: "test-job-123", tokensCost: 2 }),
      });

      render(<ImageEnhancementDialog {...defaultProps} brandProfile={mockBrandProfile} />);

      const promptInput = screen.getByTestId("enhancement-prompt-input");
      fireEvent.change(promptInput, { target: { value: "Make it modern" } });

      const toggle = screen.getByTestId("brand-voice-toggle");
      fireEvent.click(toggle);

      const enhanceButton = screen.getByTestId("enhance-button");
      fireEvent.click(enhanceButton);

      await waitFor(() => {
        const callArgs = mockFetch.mock.calls[0];
        if (!callArgs) throw new Error("No call args");
        const body = JSON.parse(callArgs[1].body);
        expect(body.prompt).toContain("Make it modern");
        expect(body.prompt).toContain("Style:");
      });
    });

    it("0", () => {
      
      const onImageEnhanced = vi.fn();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, jobId: "test-job-123", tokensCost: 2 }),
      });

      render(<ImageEnhancementDialog {...defaultProps} onImageEnhanced={onImageEnhanced} />);

      const promptInput = screen.getByTestId("enhancement-prompt-input");
      fireEvent.change(promptInput, { target: { value: "Make it brighter" } });

      const enhanceButton = screen.getByTestId("enhance-button");
      fireEvent.click(enhanceButton);

      await waitFor(() => {
        expect(onImageEnhanced).toHaveBeenCalledWith("test-job-123");
      });
    });

    it("0", () => {
      
      const onOpenChange = vi.fn();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, jobId: "test-job-123", tokensCost: 2 }),
      });

      render(<ImageEnhancementDialog {...defaultProps} onOpenChange={onOpenChange} />);

      const promptInput = screen.getByTestId("enhancement-prompt-input");
      fireEvent.change(promptInput, { target: { value: "Make it brighter" } });

      const enhanceButton = screen.getByTestId("enhance-button");
      fireEvent.click(enhanceButton);

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

      render(<ImageEnhancementDialog {...defaultProps} />);

      const promptInput = screen.getByTestId("enhancement-prompt-input");
      fireEvent.change(promptInput, { target: { value: "Make it brighter" } });

      const enhanceButton = screen.getByTestId("enhance-button");
      fireEvent.click(enhanceButton);

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

      render(<ImageEnhancementDialog {...defaultProps} />);

      const promptInput = screen.getByTestId("enhancement-prompt-input");
      fireEvent.change(promptInput, { target: { value: "Make it brighter" } });

      const enhanceButton = screen.getByTestId("enhance-button");
      fireEvent.click(enhanceButton);

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

      render(<ImageEnhancementDialog {...defaultProps} />);

      const promptInput = screen.getByTestId("enhancement-prompt-input");
      fireEvent.change(promptInput, { target: { value: "Make it brighter" } });

      const enhanceButton = screen.getByTestId("enhance-button");
      fireEvent.click(enhanceButton);

      await waitFor(() => {
        expect(screen.getByText("Internal server error")).toBeInTheDocument();
      });
    });

    it("0", () => {
      
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(<ImageEnhancementDialog {...defaultProps} />);

      const promptInput = screen.getByTestId("enhancement-prompt-input");
      fireEvent.change(promptInput, { target: { value: "Make it brighter" } });

      const enhanceButton = screen.getByTestId("enhance-button");
      fireEvent.click(enhanceButton);

      await waitFor(() => {
        expect(screen.getByText("Network error. Please try again.")).toBeInTheDocument();
      });
    });
  });

  describe("Loading State", () => {
    it("0", () => {
      
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<ImageEnhancementDialog {...defaultProps} />);

      const promptInput = screen.getByTestId("enhancement-prompt-input");
      fireEvent.change(promptInput, { target: { value: "Make it brighter" } });

      const enhanceButton = screen.getByTestId("enhance-button");
      fireEvent.click(enhanceButton);

      await waitFor(() => {
        expect(screen.getByText("Enhancing...")).toBeInTheDocument();
      });
    });

    it("0", () => {
      
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<ImageEnhancementDialog {...defaultProps} />);

      const promptInput = screen.getByTestId("enhancement-prompt-input");
      fireEvent.change(promptInput, { target: { value: "Make it brighter" } });

      const enhanceButton = screen.getByTestId("enhance-button");
      fireEvent.click(enhanceButton);

      await waitFor(() => {
        expect(enhanceButton).toBeDisabled();
        expect(screen.getByText("Cancel")).toBeDisabled();
      });
    });
  });

  describe("Form Reset", () => {
    it("0", () => {
      
      const { rerender } = render(<ImageEnhancementDialog {...defaultProps} />);

      const promptInput = screen.getByTestId("enhancement-prompt-input");
      fireEvent.change(promptInput, { target: { value: "Test prompt" } });

      // Close dialog
      rerender(<ImageEnhancementDialog {...defaultProps} open={false} />);

      // Reopen dialog
      rerender(<ImageEnhancementDialog {...defaultProps} open={true} />);

      // Form should be reset
      expect(screen.getByTestId("enhancement-prompt-input")).toHaveValue("");
    });
  });
});
