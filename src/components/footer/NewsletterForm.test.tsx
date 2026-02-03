import { NewsletterFormInner } from "@/components/footer/NewsletterForm";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}));

describe("NewsletterForm", () => {
  it("renders form with email input and subscribe button", () => {
    render(<NewsletterFormInner />);
    expect(screen.getByPlaceholderText("Enter your email")).toBeDefined();
    expect(screen.getByRole("button", { name: /subscribe/i })).toBeDefined();
  });

  it("validates email input", async () => {
    render(<NewsletterFormInner />);

    const input = screen.getByPlaceholderText("Enter your email");
    const button = screen.getByRole("button", { name: /subscribe/i });

    fireEvent.change(input, { target: { value: "invalid-email" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Please enter a valid email address.")).toBeDefined();
    });
  });

  it("shows success toast on valid submission", async () => {
    render(<NewsletterFormInner />);

    const input = screen.getByPlaceholderText("Enter your email");
    const button = screen.getByRole("button", { name: /subscribe/i });

    fireEvent.change(input, { target: { value: "test@example.com" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Thanks for subscribing!");
    });
  });

  it("resets form after successful submission", async () => {
    render(<NewsletterFormInner />);

    const input = screen.getByPlaceholderText("Enter your email") as HTMLInputElement;
    const button = screen.getByRole("button", { name: /subscribe/i });

    fireEvent.change(input, { target: { value: "test@example.com" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(input.value).toBe("");
    });
  });
});
