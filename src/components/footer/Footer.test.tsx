import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";
import { Footer } from "./Footer";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}));

describe("Footer", () => {
  it("renders correctly", () => {
    render(<Footer />);
    expect(screen.getByText("Spike Land")).toBeDefined();
    expect(screen.getByText("Subscribe to our newsletter")).toBeDefined();
    expect(screen.getByPlaceholderText("Enter your email")).toBeDefined();
    expect(screen.getByRole("button", { name: /subscribe/i })).toBeDefined();
  });

  it("validates email input", async () => {
    render(<Footer />);

    const input = screen.getByPlaceholderText("Enter your email");
    const button = screen.getByRole("button", { name: /subscribe/i });

    fireEvent.change(input, { target: { value: "invalid-email" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Please enter a valid email address.")).toBeDefined();
    });
  });

  it("shows success toast on valid submission", async () => {
    render(<Footer />);

    const input = screen.getByPlaceholderText("Enter your email");
    const button = screen.getByRole("button", { name: /subscribe/i });

    fireEvent.change(input, { target: { value: "test@example.com" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Thanks for subscribing!");
    });
  });
});
