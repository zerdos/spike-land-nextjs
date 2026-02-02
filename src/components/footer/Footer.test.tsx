import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { describe, expect, it, type Mock, vi } from "vitest";
import { Footer } from "./Footer";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
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

  it("returns null on /my-apps routes", () => {
    (usePathname as Mock).mockReturnValue("/my-apps");
    const { container } = render(<Footer />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null on /my-apps/[codeSpace] routes", () => {
    (usePathname as Mock).mockReturnValue("/my-apps/test-app");
    const { container } = render(<Footer />);
    expect(container.firstChild).toBeNull();
  });

  it("renders on non-my-apps routes", () => {
    (usePathname as Mock).mockReturnValue("/dashboard");
    render(<Footer />);
    expect(screen.getByText("Spike Land")).toBeDefined();
  });
});
