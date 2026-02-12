import { render, screen, within } from "@testing-library/react";
import { useSession } from "next-auth/react";
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PricingPage from "./page";

// Mock next-auth
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

// Mock next/navigation
const mockRouterPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

// Mock sonner toast
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

// Mock fetch for checkout
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("PricingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the new hero copy", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    expect(screen.getByText("Most of spike.land is free.")).toBeDefined();
    expect(
      screen.getByText(
        /Vibe code apps, use MCP developer tools, enhance images, and learn anything/,
      ),
    ).toBeDefined();
  });

  it("renders free platform features section", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    const section = screen.getByTestId("free-features-section");
    expect(within(section).getByText("Vibe Coding")).toBeDefined();
    expect(within(section).getByText("MCP Developer Tools")).toBeDefined();
    expect(within(section).getByText("Pixel Image Enhancement")).toBeDefined();
    expect(within(section).getByText("LearnIt Wiki")).toBeDefined();
  });

  it("shows Free badges on platform features", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    const section = screen.getByTestId("free-features-section");
    const badges = within(section).getAllByText("Free");
    expect(badges.length).toBe(4);
  });

  it("renders all three workspace tier cards", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

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

    render(<PricingPage />);

    const tiersSection = screen.getByTestId("workspace-tiers-section");
    expect(within(tiersSection).getByText("Most Popular")).toBeDefined();
  });

  it('shows "Best Value" badge for Business tier', () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    const tiersSection = screen.getByTestId("workspace-tiers-section");
    expect(within(tiersSection).getByText("Best Value")).toBeDefined();
  });

  it("shows updated Free tier limits", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    expect(screen.getByText("5 social accounts")).toBeDefined();
    expect(screen.getByText("100 scheduled posts/month")).toBeDefined();
    expect(screen.getByText("3 A/B tests")).toBeDefined();
    expect(screen.getByText("500 AI credits/month")).toBeDefined();
    expect(screen.getByText("1 team member")).toBeDefined();
  });

  it("shows vibe coding and MCP tools in Free tier", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    expect(screen.getByText("Vibe coding (unlimited)")).toBeDefined();
    expect(screen.getByText("MCP tools (unlimited)")).toBeDefined();
  });

  it("shows monthly AI credit allocations for Pro and Business", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    expect(screen.getByText("1,000 AI credits/month")).toBeDefined();
    expect(screen.getByText("5,000 AI credits/month")).toBeDefined();
  });

  it("shows social account limits for Pro tier", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    expect(screen.getByText("10 social accounts")).toBeDefined();
  });

  it("shows team member limits for each tier", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    expect(screen.getByText("1 team member")).toBeDefined();
    expect(screen.getByText("3 team members")).toBeDefined();
    expect(screen.getByText("10 team members")).toBeDefined();
  });

  it('shows "Everything in Free, plus:" header on Pro and Business', () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    const headers = screen.getAllByText("Everything in Free, plus:");
    expect(headers.length).toBe(2);
  });

  it('shows "Get Started Free" button for unauthenticated users on Free tier', () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    expect(screen.getByText("Get Started Free")).toBeDefined();
  });

  it('shows "Your Plan" disabled button for authenticated users on Free tier', () => {
    (useSession as Mock).mockReturnValue({
      data: { user: { id: "123", email: "test@test.com" } },
      status: "authenticated",
    });

    render(<PricingPage />);

    const button = screen.getByText("Your Plan");
    expect(button).toBeDefined();
    expect(button.closest("button")?.disabled).toBe(true);
  });

  it('shows "Get Started" buttons on Pro and Business tiers', () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    const getStartedButtons = screen.getAllByText("Get Started");
    expect(getStartedButtons.length).toBe(2);
  });

  it("renders workspace tiers section with data-testid", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    expect(screen.getByTestId("workspace-tiers-section")).toBeDefined();
  });

  it("renders Orbit Social Media Management heading", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    expect(
      screen.getByText("Orbit Social Media Management"),
    ).toBeDefined();
    expect(
      screen.getByText(
        /When you need to manage multiple accounts, schedule posts, and run/,
      ),
    ).toBeDefined();
  });

  it("renders new FAQ section with 3 questions", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    expect(screen.getByText("Frequently Asked Questions")).toBeDefined();
    expect(
      screen.getByText("Why is so much of this free?"),
    ).toBeDefined();
    expect(
      screen.getByText("What actually costs money?"),
    ).toBeDefined();
    expect(
      screen.getByText("How can I support the project?"),
    ).toBeDefined();
  });

  it("does not render old token package elements", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    expect(screen.queryByTestId("package-card-starter")).toBeNull();
    expect(screen.queryByTestId("package-card-basic")).toBeNull();
    expect(screen.queryByTestId("package-card-power")).toBeNull();
    expect(screen.queryByTestId("token-packages-grid")).toBeNull();
    expect(
      screen.queryByText("One-time purchase. No subscription required."),
    ).toBeNull();
    expect(screen.queryByText(/Credits never expire!/)).toBeNull();
    expect(screen.queryByText("Sign in to get free credits")).toBeNull();
  });

  it("does not render deleted sections", () => {
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<PricingPage />);

    expect(
      screen.queryByText("Pixel AI Photo Enhancement"),
    ).toBeNull();
    expect(screen.queryByText("AI Credit Usage Guide")).toBeNull();
    expect(screen.queryByText("What are AI credits used for?")).toBeNull();
    expect(screen.queryByText("Do credits roll over?")).toBeNull();
    expect(screen.queryByText("Your current balance")).toBeNull();
  });
});
