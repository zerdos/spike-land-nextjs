/**
 * PostComposer Component Tests
 *
 * Comprehensive test suite for the PostComposer component
 * Resolves #843
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PostComposer } from "./PostComposer";

// Mock the hooks
vi.mock("@/hooks/useBrandProfile", () => ({
  useBrandProfile: vi.fn(() => ({
    data: null,
    isLoading: false,
  })),
}));

// Mock the child components
vi.mock("./ImageGenerationDialog", () => ({
  ImageGenerationDialog: ({
    open,
    onOpenChange,
    onImageGenerated,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onImageGenerated?: (jobId: string, url?: string) => void;
  }) => (
    <div data-testid="image-generation-dialog" data-open={open}>
      <button onClick={() => onOpenChange(false)}>Close</button>
      <button
        onClick={() => onImageGenerated?.("job-123", "https://example.com/image.jpg")}
      >
        Generate
      </button>
    </div>
  ),
}));

vi.mock("./ImageEnhancementDialog", () => ({
  ImageEnhancementDialog: ({
    open,
    onOpenChange,
    onImageEnhanced,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onImageEnhanced?: (jobId: string, url?: string) => void;
  }) => (
    <div data-testid="image-enhancement-dialog" data-open={open}>
      <button onClick={() => onOpenChange(false)}>Close</button>
      <button
        onClick={() => onImageEnhanced?.("job-456", "https://example.com/enhanced.jpg")}
      >
        Enhance
      </button>
    </div>
  ),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("PostComposer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders the post composer form", () => {
      render(<PostComposer workspaceSlug="test-workspace" />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText("Create Post")).toBeInTheDocument();
      expect(screen.getByTestId("post-content-textarea")).toBeInTheDocument();
      expect(screen.getByText("Select Platforms")).toBeInTheDocument();
      expect(screen.getByText("Images")).toBeInTheDocument();
    });

    it("renders all platform checkboxes", () => {
      render(<PostComposer workspaceSlug="test-workspace" />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByTestId("platform-twitter")).toBeInTheDocument();
      expect(screen.getByTestId("platform-linkedin")).toBeInTheDocument();
      expect(screen.getByTestId("platform-facebook")).toBeInTheDocument();
      expect(screen.getByTestId("platform-instagram")).toBeInTheDocument();
    });

    it("renders image action buttons", () => {
      render(<PostComposer workspaceSlug="test-workspace" />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByTestId("generate-image-button")).toBeInTheDocument();
      expect(screen.getByTestId("enhance-image-button")).toBeInTheDocument();
      expect(screen.getByTestId("upload-image-button")).toBeInTheDocument();
    });

    it("renders publish and clear buttons", () => {
      render(<PostComposer workspaceSlug="test-workspace" />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByTestId("publish-button")).toBeInTheDocument();
      expect(screen.getByTestId("clear-button")).toBeInTheDocument();
      expect(screen.getByTestId("schedule-button")).toBeInTheDocument();
    });
  });

  describe("Character Counter", () => {
    it("displays character count", async () => {
      const user = userEvent.setup();
      render(<PostComposer workspaceSlug="test-workspace" />, {
        wrapper: createWrapper(),
      });

      const textarea = screen.getByTestId("post-content-textarea");
      await user.type(textarea, "Hello world");

      const counter = screen.getByTestId("character-count");
      expect(counter).toHaveTextContent("11 / 280");
    });

    it("updates character limit when platform is selected", async () => {
      const user = userEvent.setup();
      render(<PostComposer workspaceSlug="test-workspace" />, {
        wrapper: createWrapper(),
      });

      // Select LinkedIn (3000 char limit)
      const linkedinCheckbox = screen.getByTestId("platform-linkedin");
      await user.click(linkedinCheckbox);

      const counter = screen.getByTestId("character-count");
      expect(counter).toHaveTextContent("0 / 3000");
    });

    it("uses most restrictive limit when multiple platforms selected", async () => {
      const user = userEvent.setup();
      render(<PostComposer workspaceSlug="test-workspace" />, {
        wrapper: createWrapper(),
      });

      // Select both Twitter (280) and LinkedIn (3000)
      await user.click(screen.getByTestId("platform-twitter"));
      await user.click(screen.getByTestId("platform-linkedin"));

      const counter = screen.getByTestId("character-count");
      expect(counter).toHaveTextContent("0 / 280");
    });

    it("shows error state when over limit", async () => {
      const user = userEvent.setup();
      render(<PostComposer workspaceSlug="test-workspace" />, {
        wrapper: createWrapper(),
      });

      // Select Twitter and type too much
      await user.click(screen.getByTestId("platform-twitter"));
      const textarea = screen.getByTestId("post-content-textarea");
      await user.type(textarea, "a".repeat(300));

      const counter = screen.getByTestId("character-count");
      expect(counter).toHaveTextContent("300 / 280");
      expect(counter).toHaveClass("text-destructive");
    });
  });

  describe("Platform Selection", () => {
    it("allows selecting platforms", async () => {
      const user = userEvent.setup();
      render(<PostComposer workspaceSlug="test-workspace" />, {
        wrapper: createWrapper(),
      });

      const twitterCheckbox = screen.getByTestId("platform-twitter");
      await user.click(twitterCheckbox);

      expect(twitterCheckbox).toBeChecked();
    });

    it("allows deselecting platforms", async () => {
      const user = userEvent.setup();
      render(<PostComposer workspaceSlug="test-workspace" />, {
        wrapper: createWrapper(),
      });

      const twitterCheckbox = screen.getByTestId("platform-twitter");
      await user.click(twitterCheckbox);
      expect(twitterCheckbox).toBeChecked();

      await user.click(twitterCheckbox);
      expect(twitterCheckbox).not.toBeChecked();
    });

    it("allows selecting multiple platforms", async () => {
      const user = userEvent.setup();
      render(<PostComposer workspaceSlug="test-workspace" />, {
        wrapper: createWrapper(),
      });

      await user.click(screen.getByTestId("platform-twitter"));
      await user.click(screen.getByTestId("platform-linkedin"));

      expect(screen.getByTestId("platform-twitter")).toBeChecked();
      expect(screen.getByTestId("platform-linkedin")).toBeChecked();
    });
  });

  describe("Image Generation", () => {
    it("opens image generation dialog when button clicked", async () => {
      const user = userEvent.setup();
      render(<PostComposer workspaceSlug="test-workspace" />, {
        wrapper: createWrapper(),
      });

      const generateButton = screen.getByTestId("generate-image-button");
      await user.click(generateButton);

      const dialog = screen.getByTestId("image-generation-dialog");
      expect(dialog).toHaveAttribute("data-open", "true");
    });

    it("adds generated image to attachments", async () => {
      const user = userEvent.setup();
      render(<PostComposer workspaceSlug="test-workspace" />, {
        wrapper: createWrapper(),
      });

      // Open dialog
      await user.click(screen.getByTestId("generate-image-button"));

      // Simulate image generation
      const generateButton = screen.getByRole("button", { name: "Generate" });
      await user.click(generateButton);

      // Check image was added
      await waitFor(() => {
        const images = screen.getAllByRole("img");
        expect(images).toHaveLength(1);
        expect(images[0]).toHaveAttribute("src", "https://example.com/image.jpg");
      });
    });

    it("closes dialog after image generation", async () => {
      const user = userEvent.setup();
      render(<PostComposer workspaceSlug="test-workspace" />, {
        wrapper: createWrapper(),
      });

      await user.click(screen.getByTestId("generate-image-button"));
      await user.click(screen.getByRole("button", { name: "Generate" }));

      await waitFor(() => {
        const dialog = screen.getByTestId("image-generation-dialog");
        expect(dialog).toHaveAttribute("data-open", "false");
      });
    });
  });

  describe("Image Enhancement", () => {
    it("disables enhance button when no images", () => {
      render(<PostComposer workspaceSlug="test-workspace" />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByTestId("enhance-image-button")).toBeDisabled();
    });

    it("enables enhance button when images exist", async () => {
      const user = userEvent.setup();
      render(<PostComposer workspaceSlug="test-workspace" />, {
        wrapper: createWrapper(),
      });

      // Generate an image first
      await user.click(screen.getByTestId("generate-image-button"));
      await user.click(screen.getByRole("button", { name: "Generate" }));

      await waitFor(() => {
        expect(screen.getByTestId("enhance-image-button")).not.toBeDisabled();
      });
    });

    it("opens enhancement dialog when button clicked", async () => {
      const user = userEvent.setup();
      render(<PostComposer workspaceSlug="test-workspace" />, {
        wrapper: createWrapper(),
      });

      // Generate an image first
      await user.click(screen.getByTestId("generate-image-button"));
      await user.click(screen.getByRole("button", { name: "Generate" }));

      await waitFor(async () => {
        const enhanceButton = screen.getByTestId("enhance-image-button");
        await user.click(enhanceButton);

        const dialog = screen.getByTestId("image-enhancement-dialog");
        expect(dialog).toHaveAttribute("data-open", "true");
      });
    });
  });

  describe("Image Management", () => {
    it("displays attached images", async () => {
      const user = userEvent.setup();
      render(<PostComposer workspaceSlug="test-workspace" />, {
        wrapper: createWrapper(),
      });

      // Generate an image
      await user.click(screen.getByTestId("generate-image-button"));
      await user.click(screen.getByRole("button", { name: "Generate" }));

      await waitFor(() => {
        const images = screen.getAllByRole("img");
        expect(images).toHaveLength(1);
      });
    });

    it("removes image when delete button clicked", async () => {
      const user = userEvent.setup();
      render(<PostComposer workspaceSlug="test-workspace" />, {
        wrapper: createWrapper(),
      });

      // Generate an image
      await user.click(screen.getByTestId("generate-image-button"));
      await user.click(screen.getByRole("button", { name: "Generate" }));

      await waitFor(async () => {
        expect(screen.getAllByRole("img")).toHaveLength(1);

        // Remove the image
        const removeButton = screen.getByTestId("remove-image-0");
        await user.click(removeButton);

        expect(screen.queryByRole("img")).not.toBeInTheDocument();
      });
    });

    it("supports multiple images", async () => {
      const user = userEvent.setup();
      render(<PostComposer workspaceSlug="test-workspace" />, {
        wrapper: createWrapper(),
      });

      // Generate first image
      await user.click(screen.getByTestId("generate-image-button"));
      await user.click(screen.getByRole("button", { name: "Generate" }));

      // Generate second image
      await waitFor(async () => {
        await user.click(screen.getByTestId("generate-image-button"));
        await user.click(screen.getByRole("button", { name: "Generate" }));
      });

      await waitFor(() => {
        expect(screen.getAllByRole("img")).toHaveLength(2);
      });
    });
  });

  describe("Form Submission", () => {
    it("calls onPublish with correct data", async () => {
      const user = userEvent.setup();
      const onPublish = vi.fn().mockResolvedValue(undefined);

      render(
        <PostComposer workspaceSlug="test-workspace" onPublish={onPublish} />,
        { wrapper: createWrapper() },
      );

      // Fill in form
      await user.type(screen.getByTestId("post-content-textarea"), "Test post");
      await user.click(screen.getByTestId("platform-twitter"));

      // Submit
      await user.click(screen.getByTestId("publish-button"));

      await waitFor(() => {
        expect(onPublish).toHaveBeenCalledWith({
          content: "Test post",
          platforms: ["TWITTER"],
          images: [],
        });
      });
    });

    it("includes images in submission", async () => {
      const user = userEvent.setup();
      const onPublish = vi.fn().mockResolvedValue(undefined);

      render(
        <PostComposer workspaceSlug="test-workspace" onPublish={onPublish} />,
        { wrapper: createWrapper() },
      );

      // Generate image
      await user.click(screen.getByTestId("generate-image-button"));
      await user.click(screen.getByRole("button", { name: "Generate" }));

      await waitFor(async () => {
        // Fill in form
        await user.type(screen.getByTestId("post-content-textarea"), "Test");
        await user.click(screen.getByTestId("platform-twitter"));

        // Submit
        await user.click(screen.getByTestId("publish-button"));

        expect(onPublish).toHaveBeenCalledWith({
          content: "Test",
          platforms: ["TWITTER"],
          images: ["https://example.com/image.jpg"],
        });
      });
    });

    it("disables publish button when over character limit", async () => {
      const user = userEvent.setup();
      render(<PostComposer workspaceSlug="test-workspace" onPublish={vi.fn()} />, {
        wrapper: createWrapper(),
      });

      await user.click(screen.getByTestId("platform-twitter"));
      await user.type(screen.getByTestId("post-content-textarea"), "a".repeat(300));

      expect(screen.getByTestId("publish-button")).toBeDisabled();
    });

    it("disables publish button when no onPublish provided", () => {
      render(<PostComposer workspaceSlug="test-workspace" />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByTestId("publish-button")).toBeDisabled();
    });

    it("shows loading state during submission", async () => {
      const user = userEvent.setup();
      const onPublish = vi.fn(() => new Promise<void>((resolve) => setTimeout(resolve, 100)));

      render(
        <PostComposer workspaceSlug="test-workspace" onPublish={onPublish} />,
        { wrapper: createWrapper() },
      );

      await user.type(screen.getByTestId("post-content-textarea"), "Test");
      await user.click(screen.getByTestId("platform-twitter"));
      await user.click(screen.getByTestId("publish-button"));

      expect(screen.getByText("Publishing...")).toBeInTheDocument();
    });

    it("resets form after successful submission", async () => {
      const user = userEvent.setup();
      const onPublish = vi.fn().mockResolvedValue(undefined);

      render(
        <PostComposer workspaceSlug="test-workspace" onPublish={onPublish} />,
        { wrapper: createWrapper() },
      );

      const textarea = screen.getByTestId("post-content-textarea");
      await user.type(textarea, "Test post");
      await user.click(screen.getByTestId("platform-twitter"));
      await user.click(screen.getByTestId("publish-button"));

      await waitFor(() => {
        expect(textarea).toHaveValue("");
        expect(screen.getByTestId("platform-twitter")).not.toBeChecked();
      });
    });
  });

  describe("Clear Button", () => {
    it("clears all form fields", async () => {
      const user = userEvent.setup();
      render(<PostComposer workspaceSlug="test-workspace" />, {
        wrapper: createWrapper(),
      });

      // Fill in form
      const textarea = screen.getByTestId("post-content-textarea");
      await user.type(textarea, "Test content");
      await user.click(screen.getByTestId("platform-twitter"));

      // Generate an image
      await user.click(screen.getByTestId("generate-image-button"));
      await user.click(screen.getByRole("button", { name: "Generate" }));

      await waitFor(async () => {
        // Clear form
        await user.click(screen.getByTestId("clear-button"));

        expect(textarea).toHaveValue("");
        expect(screen.getByTestId("platform-twitter")).not.toBeChecked();
        expect(screen.queryByRole("img")).not.toBeInTheDocument();
      });
    });
  });

  describe("Validation", () => {
    it("shows error when content is empty", async () => {
      const user = userEvent.setup();
      const onPublish = vi.fn();

      render(
        <PostComposer workspaceSlug="test-workspace" onPublish={onPublish} />,
        { wrapper: createWrapper() },
      );

      await user.click(screen.getByTestId("platform-twitter"));
      await user.click(screen.getByTestId("publish-button"));

      await waitFor(() => {
        expect(screen.getByText("Post content is required")).toBeInTheDocument();
      });
      expect(onPublish).not.toHaveBeenCalled();
    });

    it("shows error when no platforms selected", async () => {
      const user = userEvent.setup();
      const onPublish = vi.fn();

      render(
        <PostComposer workspaceSlug="test-workspace" onPublish={onPublish} />,
        { wrapper: createWrapper() },
      );

      await user.type(screen.getByTestId("post-content-textarea"), "Test");
      await user.click(screen.getByTestId("publish-button"));

      await waitFor(() => {
        expect(
          screen.getByText("Select at least one platform"),
        ).toBeInTheDocument();
      });
      expect(onPublish).not.toHaveBeenCalled();
    });
  });

  describe("Schedule Button", () => {
    it("disables schedule button when no onSchedule provided", () => {
      render(<PostComposer workspaceSlug="test-workspace" />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByTestId("schedule-button")).toBeDisabled();
    });

    it("enables schedule button when onSchedule provided", () => {
      render(
        <PostComposer
          workspaceSlug="test-workspace"
          onSchedule={vi.fn()}
        />,
        { wrapper: createWrapper() },
      );

      expect(screen.getByTestId("schedule-button")).not.toBeDisabled();
    });
  });
});
