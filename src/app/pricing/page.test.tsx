import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useSession } from "next-auth/react";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import PricingPage from "./page";

// Mock next-auth
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: function MockImage(
    { src, alt, ...props }: {
      src: string;
      alt: string;
      [key: string]: unknown;
    },
  ) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />;
  },
}));

// Mock fetch with a helper function
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to setup fetch mocks for authenticated users
function setupAuthenticatedFetchMock(
  checkoutResponse?: { url?: string; error?: string; },
) {
  mockFetch.mockImplementation((url: string) => {
    if (url === "/api/tokens/balance") {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ balance: 5, timeUntilNextRegenMs: 300000 }),
      });
    }
    if (url === "/api/stripe/checkout") {
      return Promise.resolve({
        json: () =>
          Promise.resolve(
            checkoutResponse ?? { url: "https://checkout.stripe.com/123" },
          ),
      });
    }
    return Promise.reject(new Error(`Unexpected fetch: ${url}`));
  });
}

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

  it("hides Buy Now buttons for unauthenticated users", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    expect(screen.queryByTestId("buy-button-starter")).toBeNull();
    expect(screen.queryByTestId("buy-button-basic")).toBeNull();
    expect(screen.queryByTestId("buy-button-pro")).toBeNull();
    expect(screen.queryByTestId("buy-button-power")).toBeNull();
  });

  it("shows Sign in to get free tokens button for unauthenticated users", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    expect(screen.getByText("Sign in to get free tokens")).toBeDefined();
  });

  it("calls checkout API when authenticated user clicks Buy Now", async () => {
    (useSession as Mock).mockReturnValue({
      data: { user: { id: "123", email: "test@test.com" } },
      status: "authenticated",
    });

    setupAuthenticatedFetchMock();

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

    setupAuthenticatedFetchMock();

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

    setupAuthenticatedFetchMock({ error: "Something went wrong" });

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

    setupAuthenticatedFetchMock({});

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

    // Mock that throws on checkout
    mockFetch.mockImplementation((url: string) => {
      if (url === "/api/tokens/balance") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ balance: 5, timeUntilNextRegenMs: 300000 }),
        });
      }
      if (url === "/api/stripe/checkout") {
        return Promise.reject(new Error("Network error"));
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });

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

  it("hides buttons while session is loading", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "loading",
    });

    render(<PricingPage />);

    // Buttons are hidden for non-authenticated users (loading is not authenticated)
    expect(screen.queryByTestId("buy-button-starter")).toBeNull();
    expect(screen.queryByTestId("buy-button-basic")).toBeNull();
    expect(screen.queryByTestId("buy-button-pro")).toBeNull();
    expect(screen.queryByTestId("buy-button-power")).toBeNull();
  });

  it("shows Processing text while purchase is loading", async () => {
    (useSession as Mock).mockReturnValue({
      data: { user: { id: "123", email: "test@test.com" } },
      status: "authenticated",
    });

    // Use a promise that we control to keep the loading state active
    let resolvePromise: (value: unknown) => void;
    const checkoutPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    // Mock that keeps checkout pending
    mockFetch.mockImplementation((url: string) => {
      if (url === "/api/tokens/balance") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ balance: 5, timeUntilNextRegenMs: 300000 }),
        });
      }
      if (url === "/api/stripe/checkout") {
        return { json: () => checkoutPromise };
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
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

  it("does not show Sign in button while session is loading", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "loading",
    });

    render(<PricingPage />);

    // Sign in button is hidden during loading to avoid flash
    expect(screen.queryByText("Sign in to get free tokens")).toBeNull();
  });

  it("renders token packages grid with data-testid", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    expect(screen.getByTestId("token-packages-grid")).toBeDefined();
  });

  it("shows buy now buttons for authenticated users", () => {
    (useSession as Mock).mockReturnValue({
      data: { user: { id: "123", email: "test@test.com" } },
      status: "authenticated",
    });

    render(<PricingPage />);

    expect(screen.getByTestId("buy-button-starter")).toBeDefined();
    expect(screen.getByTestId("buy-button-basic")).toBeDefined();
    expect(screen.getByTestId("buy-button-pro")).toBeDefined();
    expect(screen.getByTestId("buy-button-power")).toBeDefined();
  });

  it("displays Free Tokens section", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    expect(screen.getByText("Free Tokens Every 15 Minutes!")).toBeDefined();
    expect(screen.getByText("+1 Token Every 15 Min")).toBeDefined();
    expect(screen.getByText("Up to 10 Free Tokens")).toBeDefined();
    expect(screen.getByText("2 Tokens = 1 Image")).toBeDefined();
  });
});
