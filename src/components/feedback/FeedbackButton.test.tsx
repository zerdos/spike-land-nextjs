import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FeedbackButton } from "./FeedbackButton";

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));
import { useSession } from "next-auth/react";

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

  describe("when not authenticated", () => {
    beforeEach(() => {
      (useSession as Mock).mockReturnValue({
        data: null,
        status: "unauthenticated",
      });
    });

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

    it("shows email field when not authenticated", async () => {
      const user = userEvent.setup();
      render(<FeedbackButton />);

      await user.click(screen.getByRole("button", { name: "Send feedback" }));

      expect(screen.getByLabelText("Email (optional)")).toBeInTheDocument();
      expect(
        screen.getByText("Provide your email if you would like us to follow up."),
      ).toBeInTheDocument();
    });

    it("renders feedback type radio buttons", async () => {
      const user = userEvent.setup();
      render(<FeedbackButton />);

      await user.click(screen.getByRole("button", { name: "Send feedback" }));

      expect(screen.getByLabelText("Bug")).toBeInTheDocument();
      expect(screen.getByLabelText("Idea")).toBeInTheDocument();
      expect(screen.getByLabelText("Other")).toBeInTheDocument();
    });

    it("has Idea selected by default", async () => {
      const user = userEvent.setup();
      render(<FeedbackButton />);

      await user.click(screen.getByRole("button", { name: "Send feedback" }));

      const ideaRadio = screen.getByRole("radio", { name: "Idea" });
      expect(ideaRadio).toBeChecked();
    });

    it("validates required message field", async () => {
      const user = userEvent.setup();
      render(<FeedbackButton />);

      await user.click(screen.getByRole("button", { name: "Send feedback" }));
      await user.click(screen.getByRole("button", { name: "Submit" }));

      expect(mockToast.error).toHaveBeenCalledWith("Please enter a message");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("validates whitespace-only message", async () => {
      const user = userEvent.setup();
      render(<FeedbackButton />);

      await user.click(screen.getByRole("button", { name: "Send feedback" }));
      await user.type(screen.getByLabelText(/Message/), "   ");
      await user.click(screen.getByRole("button", { name: "Submit" }));

      expect(mockToast.error).toHaveBeenCalledWith("Please enter a message");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("submits feedback successfully with email", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const user = userEvent.setup();
      render(<FeedbackButton />);

      await user.click(screen.getByRole("button", { name: "Send feedback" }));
      await user.click(screen.getByLabelText("Bug"));
      await user.type(screen.getByLabelText(/Message/), "Found a bug!");
      await user.type(screen.getByLabelText("Email (optional)"), "test@example.com");
      await user.click(screen.getByRole("button", { name: "Submit" }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "BUG",
            message: "Found a bug!",
            email: "test@example.com",
            page: "/test-page",
            userAgent: "test-user-agent",
          }),
        });
      });

      expect(mockToast.success).toHaveBeenCalledWith("Thank you for your feedback!");
    });

    it("submits feedback without email when not provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const user = userEvent.setup();
      render(<FeedbackButton />);

      await user.click(screen.getByRole("button", { name: "Send feedback" }));
      await user.type(screen.getByLabelText(/Message/), "Great idea!");
      await user.click(screen.getByRole("button", { name: "Submit" }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "IDEA",
            message: "Great idea!",
            email: undefined,
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
      await user.type(screen.getByLabelText(/Message/), "Test feedback");
      await user.click(screen.getByRole("button", { name: "Submit" }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Server error");
      });
    });

    it("shows generic error toast on network failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const user = userEvent.setup();
      render(<FeedbackButton />);

      await user.click(screen.getByRole("button", { name: "Send feedback" }));
      await user.type(screen.getByLabelText(/Message/), "Test feedback");
      await user.click(screen.getByRole("button", { name: "Submit" }));

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
      await user.type(screen.getByLabelText(/Message/), "Test feedback");
      await user.click(screen.getByRole("button", { name: "Submit" }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Failed to submit feedback");
      });
    });

    it("shows fallback error when non-Error object is thrown", async () => {
      mockFetch.mockRejectedValueOnce("string error");

      const user = userEvent.setup();
      render(<FeedbackButton />);

      await user.click(screen.getByRole("button", { name: "Send feedback" }));
      await user.type(screen.getByLabelText(/Message/), "Test feedback");
      await user.click(screen.getByRole("button", { name: "Submit" }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Failed to submit feedback");
      });
    });

    it("closes dialog on successful submission", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const user = userEvent.setup();
      render(<FeedbackButton />);

      await user.click(screen.getByRole("button", { name: "Send feedback" }));
      await user.type(screen.getByLabelText(/Message/), "Feedback text");
      await user.click(screen.getByRole("button", { name: "Submit" }));

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
      await user.click(screen.getByLabelText("Bug"));
      await user.type(screen.getByLabelText(/Message/), "Some message");
      await user.type(screen.getByLabelText("Email (optional)"), "test@test.com");

      // Close dialog
      await user.click(screen.getByRole("button", { name: "Cancel" }));

      // Reopen dialog
      await user.click(screen.getByRole("button", { name: "Send feedback" }));

      // Check form is reset
      expect(screen.getByRole("radio", { name: "Idea" })).toBeChecked();
      expect(screen.getByLabelText(/Message/)).toHaveValue("");
      expect(screen.getByLabelText("Email (optional)")).toHaveValue("");
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
      await user.type(screen.getByLabelText(/Message/), "Test feedback");
      await user.click(screen.getByRole("button", { name: "Submit" }));

      expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();

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
      await user.type(screen.getByLabelText(/Message/), "Test feedback");
      await user.click(screen.getByRole("button", { name: "Submit" }));

      expect(document.querySelector(".animate-spin")).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });
  });

  describe("when authenticated", () => {
    beforeEach(() => {
      (useSession as Mock).mockReturnValue({
        data: { user: { name: "Test User", email: "user@example.com" } },
        status: "authenticated",
      });
    });

    it("hides email field when authenticated", async () => {
      const user = userEvent.setup();
      render(<FeedbackButton />);

      await user.click(screen.getByRole("button", { name: "Send feedback" }));

      expect(screen.queryByLabelText("Email (optional)")).not.toBeInTheDocument();
    });

    it("submits feedback without email field for authenticated users", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const user = userEvent.setup();
      render(<FeedbackButton />);

      await user.click(screen.getByRole("button", { name: "Send feedback" }));
      await user.click(screen.getByLabelText("Other"));
      await user.type(screen.getByLabelText(/Message/), "Authenticated feedback");
      await user.click(screen.getByRole("button", { name: "Submit" }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "OTHER",
            message: "Authenticated feedback",
            email: undefined,
            page: "/test-page",
            userAgent: "test-user-agent",
          }),
        });
      });
    });
  });

  describe("when session is loading", () => {
    beforeEach(() => {
      (useSession as Mock).mockReturnValue({
        data: null,
        status: "loading",
      });
    });

    it("shows email field during loading state", async () => {
      const user = userEvent.setup();
      render(<FeedbackButton />);

      await user.click(screen.getByRole("button", { name: "Send feedback" }));

      expect(screen.getByLabelText("Email (optional)")).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    beforeEach(() => {
      (useSession as Mock).mockReturnValue({
        data: null,
        status: "unauthenticated",
      });
    });

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

    it("has proper labels for form fields", async () => {
      const user = userEvent.setup();
      render(<FeedbackButton />);

      await user.click(screen.getByRole("button", { name: "Send feedback" }));

      expect(screen.getByLabelText(/Message/)).toBeInTheDocument();
      expect(screen.getByLabelText("Email (optional)")).toBeInTheDocument();
    });

    it("indicates required field with asterisk", async () => {
      const user = userEvent.setup();
      render(<FeedbackButton />);

      await user.click(screen.getByRole("button", { name: "Send feedback" }));

      const messageLabel = screen.getByText("Message");
      expect(messageLabel.parentElement?.textContent).toContain("*");
    });
  });

  describe("custom className", () => {
    beforeEach(() => {
      (useSession as Mock).mockReturnValue({
        data: null,
        status: "unauthenticated",
      });
    });

    it("applies custom className to the button", () => {
      render(<FeedbackButton className="custom-class" />);
      const button = screen.getByRole("button", { name: "Send feedback" });
      expect(button).toHaveClass("custom-class");
    });
  });

  describe("feedback type selection", () => {
    beforeEach(() => {
      (useSession as Mock).mockReturnValue({
        data: null,
        status: "unauthenticated",
      });
    });

    it("can select Bug type", async () => {
      const user = userEvent.setup();
      render(<FeedbackButton />);

      await user.click(screen.getByRole("button", { name: "Send feedback" }));
      await user.click(screen.getByLabelText("Bug"));

      expect(screen.getByRole("radio", { name: "Bug" })).toBeChecked();
    });

    it("can select Other type", async () => {
      const user = userEvent.setup();
      render(<FeedbackButton />);

      await user.click(screen.getByRole("button", { name: "Send feedback" }));
      await user.click(screen.getByLabelText("Other"));

      expect(screen.getByRole("radio", { name: "Other" })).toBeChecked();
    });
  });
});
