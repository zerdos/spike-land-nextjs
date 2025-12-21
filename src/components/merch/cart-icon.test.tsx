/**
 * Tests for CartIcon component
 */

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CartIcon, notifyCartUpdate } from "./cart-icon";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("CartIcon", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ cart: { itemCount: 0 } }),
    });
  });

  it("should render cart icon", async () => {
    render(<CartIcon />);

    await waitFor(() => {
      expect(screen.getByRole("link")).toHaveAttribute("href", "/cart");
    });
  });

  it("should display item count badge when items exist", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ cart: { itemCount: 5 } }),
    });

    render(<CartIcon />);

    await waitFor(() => {
      expect(screen.getByText("5")).toBeInTheDocument();
    });
  });

  it("should not display badge when cart is empty", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ cart: { itemCount: 0 } }),
    });

    render(<CartIcon />);

    await waitFor(() => {
      expect(screen.queryByText("0")).not.toBeInTheDocument();
    });
  });

  it("should display 99+ for counts over 99", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ cart: { itemCount: 150 } }),
    });

    render(<CartIcon />);

    await waitFor(() => {
      expect(screen.getByText("99+")).toBeInTheDocument();
    });
  });

  it("should handle fetch error gracefully", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    render(<CartIcon />);

    // Should still render without crashing
    await waitFor(() => {
      expect(screen.getByRole("link")).toBeInTheDocument();
    });
  });

  it("should handle non-ok response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
    });

    render(<CartIcon />);

    // Should still render without crashing
    await waitFor(() => {
      expect(screen.getByRole("link")).toBeInTheDocument();
    });
  });

  it("should update cart count on cart-updated event", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ cart: { itemCount: 0 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ cart: { itemCount: 3 } }),
      });

    render(<CartIcon />);

    // Wait for initial fetch
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    // Dispatch cart update event
    notifyCartUpdate();

    // Wait for updated count
    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument();
    });
  });

  it("should apply custom className", () => {
    render(<CartIcon className="custom-class" />);
    expect(screen.getByRole("link")).toHaveClass("custom-class");
  });

  it("should have accessible label", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ cart: { itemCount: 5 } }),
    });

    render(<CartIcon />);

    await waitFor(() => {
      expect(screen.getByText(/shopping cart/i)).toBeInTheDocument();
    });
  });
});
