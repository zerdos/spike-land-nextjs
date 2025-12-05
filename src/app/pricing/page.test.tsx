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

  it("does not render subscription plans", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    expect(screen.queryByText("Monthly Plans")).toBeNull();
    expect(screen.queryByText("Hobby")).toBeNull();
    expect(screen.queryByText("Creator")).toBeNull();
    expect(screen.queryByText("Studio")).toBeNull();
    expect(screen.queryByText("Subscribe")).toBeNull();
  });

  it('shows "Most Popular" badge for pro package', () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    expect(screen.getByText("Most Popular")).toBeDefined();
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

  it("redirects to checkout URL on successful purchase", async () => {
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
      expect(window.location.href).toBe("https://checkout.stripe.com/123");
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

  it("shows default error when checkout fails without error message", async () => {
    (useSession as Mock).mockReturnValue({
      data: { user: { id: "123", email: "test@test.com" } },
      status: "authenticated",
    });

    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({}),
    });

    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(<PricingPage />);

    const buyButtons = screen.getAllByText("Buy Now");
    fireEvent.click(buyButtons[0]);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Failed to create checkout session");
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

  it("renders FAQ section with updated questions", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    expect(screen.getByText("FAQ")).toBeDefined();
    expect(screen.getByText("What are tokens used for?")).toBeDefined();
    expect(screen.getByText("Do tokens expire?")).toBeDefined();
    expect(screen.getByText("How do I get more tokens?")).toBeDefined();
  });

  it("does not render subscription-related FAQ questions", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    expect(screen.queryByText("Can I cancel my subscription?")).toBeNull();
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

  it("shows Processing text while purchase is loading", async () => {
    (useSession as Mock).mockReturnValue({
      data: { user: { id: "123", email: "test@test.com" } },
      status: "authenticated",
    });

    // Use a promise that we control to keep the loading state active
    let resolvePromise: (value: unknown) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    mockFetch.mockReturnValueOnce({
      json: () => promise,
    });

    render(<PricingPage />);

    const buyButtons = screen.getAllByText("Buy Now");
    fireEvent.click(buyButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Processing...")).toBeDefined();
    });

    // Cleanup
    resolvePromise!({ url: "https://checkout.stripe.com/123" });
  });
});
