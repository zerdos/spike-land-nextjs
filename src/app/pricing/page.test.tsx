import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useSession } from "next-auth/react";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import PricingPage from "./page";

// Mock next-auth
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("PricingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock location
    Object.defineProperty(window, "location", {
      value: { href: "" },
      writable: true,
    });
  });

  it("renders the pricing page with title", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    expect(screen.getByText("Pricing")).toBeDefined();
    expect(
      screen.getByText(/Get tokens to enhance your images with AI/),
    ).toBeDefined();
  });

  it("displays token usage info", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    expect(screen.getByText("Token Usage")).toBeDefined();
    expect(screen.getByText("token for 1K")).toBeDefined();
    expect(screen.getByText("tokens for 2K")).toBeDefined();
    expect(screen.getByText("tokens for 4K")).toBeDefined();
  });

  it("renders all token packages", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    expect(screen.getByText("Starter Pack")).toBeDefined();
    expect(screen.getByText("Basic Pack")).toBeDefined();
    expect(screen.getByText("Pro Pack")).toBeDefined();
    expect(screen.getByText("Power Pack")).toBeDefined();
  });

  it("renders all subscription plans", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    expect(screen.getByText("Hobby")).toBeDefined();
    expect(screen.getByText("Creator")).toBeDefined();
    expect(screen.getByText("Studio")).toBeDefined();
  });

  it('shows "Most Popular" badge for pro package', () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    expect(screen.getByText("Most Popular")).toBeDefined();
  });

  it('shows "Best Value" badge for creator plan', () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    expect(screen.getByText("Best Value")).toBeDefined();
  });

  it("redirects to login when unauthenticated user tries to purchase", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    const buyButtons = screen.getAllByText("Buy Now");
    fireEvent.click(buyButtons[0]);

    expect(window.location.href).toBe("/?callbackUrl=/pricing");
  });

  it("redirects to login when unauthenticated user tries to subscribe", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    const subscribeButtons = screen.getAllByText("Subscribe");
    fireEvent.click(subscribeButtons[0]);

    expect(window.location.href).toBe("/?callbackUrl=/pricing");
  });

  it("calls checkout API when authenticated user clicks Buy Now", async () => {
    (useSession as Mock).mockReturnValue({
      data: { user: { id: "123", email: "test@test.com" } },
      status: "authenticated",
    });

    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ url: "https://checkout.stripe.com/123" }),
    });

    render(<PricingPage />);

    const buyButtons = screen.getAllByText("Buy Now");
    fireEvent.click(buyButtons[0]);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: "starter", mode: "payment" }),
      });
    });
  });

  it("calls checkout API when authenticated user clicks Subscribe", async () => {
    (useSession as Mock).mockReturnValue({
      data: { user: { id: "123", email: "test@test.com" } },
      status: "authenticated",
    });

    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ url: "https://checkout.stripe.com/456" }),
    });

    render(<PricingPage />);

    const subscribeButtons = screen.getAllByText("Subscribe");
    fireEvent.click(subscribeButtons[0]);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: "hobby", mode: "subscription" }),
      });
    });
  });

  it("shows error when checkout fails", async () => {
    (useSession as Mock).mockReturnValue({
      data: { user: { id: "123", email: "test@test.com" } },
      status: "authenticated",
    });

    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ error: "Something went wrong" }),
    });

    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(<PricingPage />);

    const buyButtons = screen.getAllByText("Buy Now");
    fireEvent.click(buyButtons[0]);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Something went wrong");
    });
  });

  it("shows error when network request fails", async () => {
    (useSession as Mock).mockReturnValue({
      data: { user: { id: "123", email: "test@test.com" } },
      status: "authenticated",
    });

    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    render(<PricingPage />);

    const buyButtons = screen.getAllByText("Buy Now");
    fireEvent.click(buyButtons[0]);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Failed to start checkout");
    });

    consoleSpy.mockRestore();
  });

  it("renders FAQ section", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    expect(screen.getByText("FAQ")).toBeDefined();
    expect(screen.getByText("What are tokens used for?")).toBeDefined();
    expect(screen.getByText("Do tokens expire?")).toBeDefined();
    expect(screen.getByText("Can I cancel my subscription?")).toBeDefined();
  });

  it("disables buttons while loading", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "loading",
    });

    render(<PricingPage />);

    const buyButtons = screen.getAllByRole("button", { name: /Buy Now/i });
    buyButtons.forEach((button) => {
      expect(button).toHaveProperty("disabled", true);
    });
  });
});
