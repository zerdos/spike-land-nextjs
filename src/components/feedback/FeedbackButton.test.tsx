import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FeedbackButton } from "./FeedbackButton";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/test-page",
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));
import { toast as mockToast } from "sonner";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock navigator.userAgent
Object.defineProperty(navigator, "userAgent", {
  value: "test-user-agent",
  writable: true,
});

describe("FeedbackButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe("rendering", () => {
    it("renders the floating button", () => {
      render(<FeedbackButton />);
      const button = screen.getByRole("button", { name: "Send feedback" });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass("fixed", "bottom-4", "right-4", "z-40");
    });

    it("opens dialog on click", async () => {
      const user = userEvent.setup();
      render(<FeedbackButton />);

      await user.click(screen.getByRole("button", { name: "Send feedback" }));

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Send Feedback")).toBeInTheDocument();
      expect(
        screen.getByText("Share your thoughts, report bugs, or suggest new ideas."),
      ).toBeInTheDocument();
    });

    it("renders feedback type toggle buttons", async () => {
      const user = userEvent.setup();
      render(<FeedbackButton />);

      await user.click(screen.getByRole("button", { name: "Send feedback" }));

      expect(screen.getByRole("button", { name: /Bug/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Idea/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Other/i })).toBeInTheDocument();
    });

    it("has Bug selected by default", async () => {
      const user = userEvent.setup();
      render(<FeedbackButton />);

      await user.click(screen.getByRole("button", { name: "Send feedback" }));

      const bugButton = screen.getByRole("button", { name: /Bug/i });
      expect(bugButton).toHaveClass("bg-secondary/80");
    });
  });

  describe("form validation", () => {
    it("validates required message field", async () => {
      const user = userEvent.setup();
      render(<FeedbackButton />);

      await user.click(screen.getByRole("button", { name: "Send feedback" }));
      await user.click(screen.getByRole("button", { name: /Submit/i }));

      expect(mockToast.error).toHaveBeenCalledWith("Please enter a message");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("validates whitespace-only message", async () => {
      const user = userEvent.setup();
      render(<FeedbackButton />);

      await user.click(screen.getByRole("button", { name: "Send feedback" }));
      await user.type(screen.getByPlaceholderText("Describe your feedback..."), "   ");
      await user.click(screen.getByRole("button", { name: /Submit/i }));

      expect(mockToast.error).toHaveBeenCalledWith("Please enter a message");
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("form submission", () => {
    it("submits feedback successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const user = userEvent.setup();
      render(<FeedbackButton />);

      await user.click(screen.getByRole("button", { name: "Send feedback" }));
      await user.type(screen.getByPlaceholderText("Describe your feedback..."), "Found a bug!");
      await user.click(screen.getByRole("button", { name: /Submit/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "BUG",
            message: "Found a bug!",
            page: "/test-page",
            userAgent: "test-user-agent",
          }),
        });
      });

      expect(mockToast.success).toHaveBeenCalledWith("Thank you for your feedback!");
    });

    it("submits with different feedback type", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const user = userEvent.setup();
      render(<FeedbackButton />);

      await user.click(screen.getByRole("button", { name: "Send feedback" }));
      await user.click(screen.getByRole("button", { name: /Idea/i }));
      await user.type(screen.getByPlaceholderText("Describe your feedback..."), "Great idea!");
      await user.click(screen.getByRole("button", { name: /Submit/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "IDEA",
            message: "Great idea!",
            page: "/test-page",
            userAgent: "test-user-agent",
          }),
        });
      });
    });

    it("shows error toast on API failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Server error" }),
      });

      const user = userEvent.setup();
      render(<FeedbackButton />);

      await user.click(screen.getByRole("button", { name: "Send feedback" }));
      await user.type(screen.getByPlaceholderText("Describe your feedback..."), "Test feedback");
      await user.click(screen.getByRole("button", { name: /Submit/i }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Server error");
      });
    });

    it("shows generic error toast on network failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const user = userEvent.setup();
      render(<FeedbackButton />);

      await user.click(screen.getByRole("button", { name: "Send feedback" }));
      await user.type(screen.getByPlaceholderText("Describe your feedback..."), "Test feedback");
      await user.click(screen.getByRole("button", { name: /Submit/i }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Network error");
      });
    });

    it("shows fallback error when API returns no error message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      const user = userEvent.setup();
      render(<FeedbackButton />);

      await user.click(screen.getByRole("button", { name: "Send feedback" }));
      await user.type(screen.getByPlaceholderText("Describe your feedback..."), "Test feedback");
      await user.click(screen.getByRole("button", { name: /Submit/i }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Failed to submit feedback");
      });
    });

    it("shows fallback error when non-Error object is thrown", async () => {
      mockFetch.mockRejectedValueOnce("string error");

      const user = userEvent.setup();
      render(<FeedbackButton />);

      await user.click(screen.getByRole("button", { name: "Send feedback" }));
      await user.type(screen.getByPlaceholderText("Describe your feedback..."), "Test feedback");
      await user.click(screen.getByRole("button", { name: /Submit/i }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Failed to submit feedback");
      });
    });
  });

  describe("dialog behavior", () => {
    it("closes dialog on successful submission", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const user = userEvent.setup();
      render(<FeedbackButton />);

      await user.click(screen.getByRole("button", { name: "Send feedback" }));
      await user.type(screen.getByPlaceholderText("Describe your feedback..."), "Feedback text");
      await user.click(screen.getByRole("button", { name: /Submit/i }));

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });

    it("closes dialog on Cancel click", async () => {
      const user = userEvent.setup();
      render(<FeedbackButton />);

      await user.click(screen.getByRole("button", { name: "Send feedback" }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Cancel" }));

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });

    it("resets form when dialog is closed", async () => {
      const user = userEvent.setup();
      render(<FeedbackButton />);

      // Open and fill form
      await user.click(screen.getByRole("button", { name: "Send feedback" }));
      await user.click(screen.getByRole("button", { name: /Idea/i }));
      await user.type(screen.getByPlaceholderText("Describe your feedback..."), "Some message");

      // Close dialog
      await user.click(screen.getByRole("button", { name: "Cancel" }));

      // Reopen dialog
      await user.click(screen.getByRole("button", { name: "Send feedback" }));

      // Check form is reset - Bug should be selected by default
      const bugButton = screen.getByRole("button", { name: /Bug/i });
      expect(bugButton).toHaveClass("bg-secondary/80");
      expect(screen.getByPlaceholderText("Describe your feedback...")).toHaveValue("");
    });

    it("disables buttons while submitting", async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() =>
              resolve({
                ok: true,
                json: async () => ({ success: true }),
              }), 100)
          ),
      );

      const user = userEvent.setup();
      render(<FeedbackButton />);

      await user.click(screen.getByRole("button", { name: "Send feedback" }));
      await user.type(screen.getByPlaceholderText("Describe your feedback..."), "Test feedback");
      await user.click(screen.getByRole("button", { name: /Submit/i }));

      expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
      expect(screen.getByRole("button", { name: /Submit/i })).toBeDisabled();

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });

    it("shows loading spinner while submitting", async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() =>
              resolve({
                ok: true,
                json: async () => ({ success: true }),
              }), 100)
          ),
      );

      const user = userEvent.setup();
      render(<FeedbackButton />);

      await user.click(screen.getByRole("button", { name: "Send feedback" }));
      await user.type(screen.getByPlaceholderText("Describe your feedback..."), "Test feedback");
      await user.click(screen.getByRole("button", { name: /Submit/i }));

      expect(document.querySelector(".animate-spin")).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });
  });

  describe("accessibility", () => {
    it("has proper aria-label on floating button", () => {
      render(<FeedbackButton />);
      const button = screen.getByRole("button", { name: "Send feedback" });
      expect(button).toHaveAttribute("aria-label", "Send feedback");
    });

    it("has proper dialog structure", async () => {
      const user = userEvent.setup();
      render(<FeedbackButton />);

      await user.click(screen.getByRole("button", { name: "Send feedback" }));

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Send Feedback" })).toBeInTheDocument();
    });

    it("has textarea with placeholder", async () => {
      const user = userEvent.setup();
      render(<FeedbackButton />);

      await user.click(screen.getByRole("button", { name: "Send feedback" }));

      expect(screen.getByPlaceholderText("Describe your feedback...")).toBeInTheDocument();
    });
  });

  describe("custom className", () => {
    it("applies custom className to the button", () => {
      render(<FeedbackButton className="custom-class" />);
      const button = screen.getByRole("button", { name: "Send feedback" });
      expect(button).toHaveClass("custom-class");
    });
  });

  describe("feedback type selection", () => {
    it("can select Idea type", async () => {
      const user = userEvent.setup();
      render(<FeedbackButton />);

      await user.click(screen.getByRole("button", { name: "Send feedback" }));
      await user.click(screen.getByRole("button", { name: /Idea/i }));

      const ideaButton = screen.getByRole("button", { name: /Idea/i });
      expect(ideaButton).toHaveClass("bg-secondary/80");
    });

    it("can select Other type", async () => {
      const user = userEvent.setup();
      render(<FeedbackButton />);

      await user.click(screen.getByRole("button", { name: "Send feedback" }));
      await user.click(screen.getByRole("button", { name: /Other/i }));

      const otherButton = screen.getByRole("button", { name: /Other/i });
      expect(otherButton).toHaveClass("bg-secondary/80");
    });

    it("submits with Other type", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const user = userEvent.setup();
      render(<FeedbackButton />);

      await user.click(screen.getByRole("button", { name: "Send feedback" }));
      await user.click(screen.getByRole("button", { name: /Other/i }));
      await user.type(screen.getByPlaceholderText("Describe your feedback..."), "Other feedback");
      await user.click(screen.getByRole("button", { name: /Submit/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "OTHER",
            message: "Other feedback",
            page: "/test-page",
            userAgent: "test-user-agent",
          }),
        });
      });
    });
  });
});
