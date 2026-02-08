import { render, screen, within } from "@testing-library/react";
import { useSession } from "next-auth/react";
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

// Mock fetch for the useWorkspaceCredits hook
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to setup fetch mock for credit balance
function setupCreditBalanceMock(remaining = 5) {
  mockFetch.mockImplementation((url: string) => {
    if (url === "/api/credits/balance") {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            remaining,
            limit: 100,
            used: 100 - remaining,
            tier: "FREE",
            workspaceId: "ws_123",
          }),
      });
    }
    return Promise.reject(new Error(`Unexpected fetch: ${url}`));
  });
}

describe("PricingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the pricing page with title", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });
    setupCreditBalanceMock();

    render(<PricingPage />);

    expect(screen.getByText("Pricing")).toBeDefined();
    expect(
      screen.getByText(
        /Choose a workspace plan that fits your social media and AI needs/,
      ),
    ).toBeDefined();
  });

  it("displays AI credit usage guide", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });
    setupCreditBalanceMock();

    render(<PricingPage />);

    expect(screen.getByText("AI Credit Usage Guide")).toBeDefined();
    expect(screen.getByText("1K Enhancement")).toBeDefined();
    expect(screen.getByText("2K Enhancement")).toBeDefined();
    expect(screen.getByText("4K Enhancement")).toBeDefined();
  });

  it("displays credit cost descriptions for each tier", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });
    setupCreditBalanceMock();

    render(<PricingPage />);

    expect(screen.getByText("1 credit per image")).toBeDefined();
    expect(screen.getByText("2 credits per image")).toBeDefined();
    expect(screen.getByText("5 credits per image")).toBeDefined();
  });

  it("renders all three workspace tier cards", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });
    setupCreditBalanceMock();

    render(<PricingPage />);

    const tiersSection = screen.getByTestId("workspace-tiers-section");
    expect(within(tiersSection).getByText("Free")).toBeDefined();
    expect(within(tiersSection).getByText("Pro")).toBeDefined();
    expect(within(tiersSection).getByText("Business")).toBeDefined();
  });

  it("shows correct pricing for each tier", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });
    setupCreditBalanceMock();

    render(<PricingPage />);

    expect(screen.getByText("$0")).toBeDefined();
    expect(screen.getByText("$29")).toBeDefined();
    expect(screen.getByText("$99")).toBeDefined();
  });

  it('shows "Most Popular" badge for Pro tier', () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });
    setupCreditBalanceMock();

    render(<PricingPage />);

    const tiersSection = screen.getByTestId("workspace-tiers-section");
    expect(within(tiersSection).getByText("Most Popular")).toBeDefined();
  });

  it('shows "Best Value" badge for Business tier', () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });
    setupCreditBalanceMock();

    render(<PricingPage />);

    const tiersSection = screen.getByTestId("workspace-tiers-section");
    expect(within(tiersSection).getByText("Best Value")).toBeDefined();
  });

  it("shows monthly AI credit allocations for each tier", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });
    setupCreditBalanceMock();

    render(<PricingPage />);

    expect(screen.getByText("100 AI credits/month")).toBeDefined();
    expect(screen.getByText("1,000 AI credits/month")).toBeDefined();
    expect(screen.getByText("5,000 AI credits/month")).toBeDefined();
  });

  it("shows social account limits for each tier", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });
    setupCreditBalanceMock();

    render(<PricingPage />);

    expect(screen.getByText("3 social accounts")).toBeDefined();
    expect(screen.getByText("10 social accounts")).toBeDefined();
  });

  it("shows team member limits for each tier", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });
    setupCreditBalanceMock();

    render(<PricingPage />);

    expect(screen.getByText("1 team member")).toBeDefined();
    expect(screen.getByText("3 team members")).toBeDefined();
    expect(screen.getByText("10 team members")).toBeDefined();
  });

  it('shows "Current Plan" button on Free tier', () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });
    setupCreditBalanceMock();

    render(<PricingPage />);

    expect(screen.getByText("Current Plan")).toBeDefined();
  });

  it('shows "Coming Soon" buttons on Pro and Business tiers', () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });
    setupCreditBalanceMock();

    render(<PricingPage />);

    const comingSoonButtons = screen.getAllByText("Coming Soon");
    expect(comingSoonButtons.length).toBe(2);
  });

  it("renders workspace tiers section with data-testid", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });
    setupCreditBalanceMock();

    render(<PricingPage />);

    expect(screen.getByTestId("workspace-tiers-section")).toBeDefined();
  });

  it("renders Orbit Workspace Plans heading", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });
    setupCreditBalanceMock();

    render(<PricingPage />);

    expect(screen.getByText("Orbit Workspace Plans")).toBeDefined();
    expect(
      screen.getByText(
        /Power your social media management with Orbit workspace subscriptions/,
      ),
    ).toBeDefined();
  });

  it("renders AI hero card with enhancement description", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });
    setupCreditBalanceMock();

    render(<PricingPage />);

    expect(
      screen.getByText("Integrated AI Image Enhancement"),
    ).toBeDefined();
    expect(
      screen.getByText(
        /Use Orbit's built-in AI to enhance your brand photography/,
      ),
    ).toBeDefined();
  });

  it("does not show credit balance for unauthenticated users", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });
    setupCreditBalanceMock();

    render(<PricingPage />);

    expect(screen.queryByText("Your current balance")).toBeNull();
  });

  it("shows credit balance for authenticated users", async () => {
    (useSession as Mock).mockReturnValue({
      data: { user: { id: "123", email: "test@test.com" } },
      status: "authenticated",
    });
    setupCreditBalanceMock(42);

    render(<PricingPage />);

    expect(screen.getByText("Your current balance")).toBeDefined();
  });

  it("renders FAQ section with updated questions", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });
    setupCreditBalanceMock();

    render(<PricingPage />);

    expect(screen.getByText("Frequently Asked Questions")).toBeDefined();
    expect(
      screen.getByText("What are AI credits used for?"),
    ).toBeDefined();
    expect(screen.getByText("How do I get more credits?")).toBeDefined();
    expect(screen.getByText("Do credits roll over?")).toBeDefined();
    expect(
      screen.getByText("What happens if an enhancement fails?"),
    ).toBeDefined();
  });

  it("does not render old token package elements", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });
    setupCreditBalanceMock();

    render(<PricingPage />);

    // Old token package test IDs should not exist
    expect(screen.queryByTestId("package-card-starter")).toBeNull();
    expect(screen.queryByTestId("package-card-basic")).toBeNull();
    expect(screen.queryByTestId("package-card-power")).toBeNull();
    expect(screen.queryByTestId("token-packages-grid")).toBeNull();

    // Old copy should not exist
    expect(
      screen.queryByText("One-time purchase. No subscription required."),
    ).toBeNull();
    expect(screen.queryByText(/Credits never expire!/)).toBeNull();
    expect(screen.queryByText("Sign in to get free credits")).toBeNull();
  });

  it("renders hero image with correct alt text", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });
    setupCreditBalanceMock();

    render(<PricingPage />);

    expect(screen.getByAltText("Orbit AI Credits")).toBeDefined();
  });

  it("shows loading state for credit balance", () => {
    (useSession as Mock).mockReturnValue({
      data: { user: { id: "123", email: "test@test.com" } },
      status: "authenticated",
    });

    // Return a promise that never resolves to keep loading state
    mockFetch.mockImplementation(() => new Promise(() => {}));

    render(<PricingPage />);

    expect(screen.getByText("Your current balance")).toBeDefined();
    expect(screen.getByText("...")).toBeDefined();
  });
});
