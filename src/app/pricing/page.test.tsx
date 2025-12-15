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

  it("displays token usage guide", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    expect(screen.getByText("Token Usage Guide")).toBeDefined();
    expect(screen.getByText("1K Enhancement")).toBeDefined();
    expect(screen.getByText("2K Enhancement")).toBeDefined();
    expect(screen.getByText("4K Enhancement")).toBeDefined();
  });

  it("renders all token packages", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    // Use testids since pack names appear in FAQ as well
    expect(screen.getByTestId("package-card-starter")).toBeDefined();
    expect(screen.getByTestId("package-card-basic")).toBeDefined();
    expect(screen.getByTestId("package-card-pro")).toBeDefined();
    expect(screen.getByTestId("package-card-power")).toBeDefined();
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

  it('shows "Best Value" badge for power package', () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    expect(screen.getByText("Best Value")).toBeDefined();
  });

  it("shows Save percentage badges on non-starter packages", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    // Should have multiple save badges
    const saveBadges = screen.getAllByText(/Save \d+%/);
    expect(saveBadges.length).toBeGreaterThanOrEqual(2);
  });

  it("shows enhancement estimates for each package", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    // Each package should show enhancement estimates
    const enhanceUpTo = screen.getAllByText("Enhance up to:");
    expect(enhanceUpTo.length).toBe(4);

    // Each package shows estimates for 1K, 2K, and 4K
    expect(screen.getAllByText(/images at 1K/).length).toBe(4);
    expect(screen.getAllByText(/images at 2K/).length).toBe(4);
    expect(screen.getAllByText(/images at 4K/).length).toBe(4);
  });

  it("renders package cards with data-testid", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    expect(screen.getByTestId("package-card-starter")).toBeDefined();
    expect(screen.getByTestId("package-card-basic")).toBeDefined();
    expect(screen.getByTestId("package-card-pro")).toBeDefined();
    expect(screen.getByTestId("package-card-power")).toBeDefined();
  });

  it("shows one-time purchase message", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    expect(screen.getByText("One-time purchase. No subscription required."))
      .toBeDefined();
  });

  it("shows tokens never expire message", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    expect(screen.getByText(/Tokens never expire!/)).toBeDefined();
  });

  it("redirects to login when unauthenticated user tries to purchase", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    const buyButton = screen.getByTestId("buy-button-starter");
    fireEvent.click(buyButton);

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

    const buyButton = screen.getByTestId("buy-button-starter");
    fireEvent.click(buyButton);

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

    const buyButton = screen.getByTestId("buy-button-starter");
    fireEvent.click(buyButton);

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

    const buyButton = screen.getByTestId("buy-button-starter");
    fireEvent.click(buyButton);

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

    const buyButton = screen.getByTestId("buy-button-starter");
    fireEvent.click(buyButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "Failed to create checkout session",
      );
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

    const buyButton = screen.getByTestId("buy-button-starter");
    fireEvent.click(buyButton);

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

    expect(screen.getByText("Frequently Asked Questions")).toBeDefined();
    expect(screen.getByText("What are tokens used for?")).toBeDefined();
    expect(screen.getByText("Do tokens expire?")).toBeDefined();
    expect(screen.getByText("Which pack should I choose?")).toBeDefined();
    expect(screen.getByText("Can I get a refund?")).toBeDefined();
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

    expect(screen.getByTestId("buy-button-starter")).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByTestId("buy-button-basic")).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByTestId("buy-button-pro")).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByTestId("buy-button-power")).toHaveProperty(
      "disabled",
      true,
    );
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

    const buyButton = screen.getByTestId("buy-button-starter");
    fireEvent.click(buyButton);

    await waitFor(() => {
      expect(screen.getByText("Redirecting to checkout...")).toBeDefined();
    });

    // Cleanup
    resolvePromise!({ url: "https://checkout.stripe.com/123" });
  });

  it("shows Loading text when session is loading", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "loading",
    });

    render(<PricingPage />);

    const buyButton = screen.getByTestId("buy-button-starter");
    expect(buyButton.textContent).toContain("Loading...");
    expect(buyButton).toHaveProperty("disabled", true);
  });

  it("renders token packages grid with data-testid", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    expect(screen.getByTestId("token-packages-grid")).toBeDefined();
  });

  it("shows buy now buttons with data-testid", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    expect(screen.getByTestId("buy-button-starter")).toBeDefined();
    expect(screen.getByTestId("buy-button-basic")).toBeDefined();
    expect(screen.getByTestId("buy-button-pro")).toBeDefined();
    expect(screen.getByTestId("buy-button-power")).toBeDefined();
  });
});
