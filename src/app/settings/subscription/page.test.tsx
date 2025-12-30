import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SubscriptionPage from "./page";

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock useTier hook
const mockUseTier: {
  tiers: Array<{ tier: string; displayName: string; wellCapacity: number; priceGBP: number; }>;
  currentTier: string;
  canUpgrade: boolean;
  nextTier: { tier: string; displayName: string; wellCapacity: number; priceGBP: number; } | null;
  showUpgradePrompt: boolean;
  isPremiumAtZero: boolean;
  premiumOptions: null;
  isLoading: boolean;
  error: Error | null;
  dismissPrompt: ReturnType<typeof vi.fn>;
  refetch: ReturnType<typeof vi.fn>;
  checkPromptStatus: ReturnType<typeof vi.fn>;
} = {
  tiers: [
    { tier: "FREE", displayName: "Free", wellCapacity: 100, priceGBP: 0 },
    { tier: "BASIC", displayName: "Basic", wellCapacity: 20, priceGBP: 5 },
    { tier: "STANDARD", displayName: "Standard", wellCapacity: 50, priceGBP: 10 },
    { tier: "PREMIUM", displayName: "Premium", wellCapacity: 100, priceGBP: 20 },
  ],
  currentTier: "FREE",
  canUpgrade: true,
  nextTier: { tier: "BASIC", displayName: "Basic", wellCapacity: 20, priceGBP: 5 },
  showUpgradePrompt: false,
  isPremiumAtZero: false,
  premiumOptions: null,
  isLoading: false,
  error: null,
  dismissPrompt: vi.fn(),
  refetch: vi.fn(),
  checkPromptStatus: vi.fn(),
};

vi.mock("@/hooks/useTier", () => ({
  useTier: () => mockUseTier,
}));

// Mock useTokenBalance hook
const mockUseTokenBalance = {
  balance: 50,
  tier: "FREE",
  maxBalance: 100,
  isLoading: false,
  error: null,
  isLowBalance: false,
  isCriticalBalance: false,
  refetch: vi.fn(),
};

vi.mock("@/hooks/useTokenBalance", () => ({
  useTokenBalance: () => mockUseTokenBalance,
}));

// Mock useTierUpgrade hook
const mockUpgrade = vi.fn().mockResolvedValue({ success: true });
const mockUpgradeAndRedirect = vi.fn().mockResolvedValue({ success: true });
const mockUseTierUpgrade: {
  upgrade: ReturnType<typeof vi.fn>;
  upgradeAndRedirect: ReturnType<typeof vi.fn>;
  isUpgrading: boolean;
  error: Error | null;
} = {
  upgrade: mockUpgrade,
  upgradeAndRedirect: mockUpgradeAndRedirect,
  isUpgrading: false,
  error: null,
};

vi.mock("@/hooks/useTierUpgrade", () => ({
  useTierUpgrade: () => mockUseTierUpgrade,
}));

// Mock useDowngrade hook
const mockScheduleDowngrade = vi.fn().mockResolvedValue({ success: true });
const mockCancelDowngrade = vi.fn().mockResolvedValue({ success: true });
const mockUseDowngrade: {
  scheduleDowngrade: ReturnType<typeof vi.fn>;
  cancelDowngrade: ReturnType<typeof vi.fn>;
  scheduledDowngrade: { targetTier: string; effectiveDate: Date; } | null;
  isScheduling: boolean;
  isCanceling: boolean;
  error: null;
  clearScheduledDowngrade: ReturnType<typeof vi.fn>;
} = {
  scheduleDowngrade: mockScheduleDowngrade,
  cancelDowngrade: mockCancelDowngrade,
  scheduledDowngrade: null,
  isScheduling: false,
  isCanceling: false,
  error: null,
  clearScheduledDowngrade: vi.fn(),
};

vi.mock("@/hooks/useDowngrade", () => ({
  useDowngrade: () => mockUseDowngrade,
}));

describe("SubscriptionPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { user: { id: "1", name: "Test User", email: "test@example.com" } },
      status: "authenticated",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("loading state", () => {
    it("shows loading spinner when session is loading", () => {
      (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
        data: null,
        status: "loading",
      });

      render(<SubscriptionPage />);
      expect(screen.getByTestId("loading-state")).toBeInTheDocument();
    });
  });

  describe("unauthenticated", () => {
    it("redirects to signin when unauthenticated", () => {
      (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
        data: null,
        status: "unauthenticated",
      });

      render(<SubscriptionPage />);
      expect(redirect).toHaveBeenCalledWith("/auth/signin");
    });
  });

  describe("authenticated", () => {
    it("renders the subscription page", () => {
      render(<SubscriptionPage />);
      expect(screen.getByTestId("subscription-page")).toBeInTheDocument();
    });

    it("displays page title", () => {
      render(<SubscriptionPage />);
      expect(screen.getByText("Subscription")).toBeInTheDocument();
    });

    it("shows back button to settings", () => {
      render(<SubscriptionPage />);
      expect(screen.getByTestId("back-button")).toBeInTheDocument();
      expect(screen.getByText("Back to Settings")).toBeInTheDocument();
    });

    it("displays current plan card", () => {
      render(<SubscriptionPage />);
      expect(screen.getByTestId("current-plan-card")).toBeInTheDocument();
      // "Current Plan" appears in card header and tier badge
      expect(screen.getAllByText("Current Plan").length).toBeGreaterThanOrEqual(1);
    });

    it("shows token balance", () => {
      render(<SubscriptionPage />);
      expect(screen.getByTestId("token-balance")).toHaveTextContent("50");
    });

    it("shows well capacity", () => {
      render(<SubscriptionPage />);
      expect(screen.getByTestId("well-capacity")).toHaveTextContent("100");
    });

    it("shows monthly price as Free for FREE tier", () => {
      render(<SubscriptionPage />);
      expect(screen.getByTestId("monthly-price")).toHaveTextContent("Free");
    });
  });

  describe("tier cards", () => {
    it("renders all tier cards", () => {
      render(<SubscriptionPage />);
      expect(screen.getByTestId("tier-card-FREE")).toBeInTheDocument();
      expect(screen.getByTestId("tier-card-BASIC")).toBeInTheDocument();
      expect(screen.getByTestId("tier-card-STANDARD")).toBeInTheDocument();
      expect(screen.getByTestId("tier-card-PREMIUM")).toBeInTheDocument();
    });

    it("marks current tier with badge", () => {
      render(<SubscriptionPage />);
      expect(screen.getByTestId("current-tier-badge")).toBeInTheDocument();
    });
  });

  describe("upgrade functionality", () => {
    it("shows upgrade buttons for higher tiers", () => {
      render(<SubscriptionPage />);
      // FREE user should see upgrade buttons on BASIC, STANDARD, PREMIUM
      const upgradeButtons = screen.getAllByTestId("upgrade-button");
      expect(upgradeButtons.length).toBe(3);
    });

    it("calls upgradeAndRedirect when upgrade button clicked", async () => {
      render(<SubscriptionPage />);

      const upgradeButtons = screen.getAllByTestId("upgrade-button");
      const firstUpgradeButton = upgradeButtons[0];
      if (!firstUpgradeButton) throw new Error("No upgrade button found");
      fireEvent.click(firstUpgradeButton); // Click first upgrade button (BASIC)

      await waitFor(() => {
        expect(mockUpgradeAndRedirect).toHaveBeenCalledWith("BASIC");
      });
    });
  });

  describe("downgrade functionality", () => {
    it("does not show downgrade buttons for lowest tier", () => {
      render(<SubscriptionPage />);
      // FREE user should not see any downgrade buttons
      expect(screen.queryByTestId("downgrade-button")).not.toBeInTheDocument();
    });
  });

  describe("help section", () => {
    it("displays help card", () => {
      render(<SubscriptionPage />);
      expect(screen.getByText("Need Help?")).toBeInTheDocument();
    });

    it("shows contact support link", () => {
      render(<SubscriptionPage />);
      expect(screen.getByText("Contact Support")).toBeInTheDocument();
    });
  });
});

describe("SubscriptionPage - Premium user", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { user: { id: "1", name: "Test User" } },
      status: "authenticated",
    });
    // Update mock for premium user
    mockUseTier.currentTier = "PREMIUM";
    mockUseTier.canUpgrade = false;
    mockUseTier.nextTier = null;
    mockUseTokenBalance.tier = "PREMIUM";
  });

  afterEach(() => {
    // Reset to defaults
    mockUseTier.currentTier = "FREE";
    mockUseTier.canUpgrade = true;
    mockUseTier.nextTier = { tier: "BASIC", displayName: "Basic", wellCapacity: 20, priceGBP: 5 };
    mockUseTokenBalance.tier = "FREE";
  });

  it("shows downgrade buttons for lower tiers", () => {
    render(<SubscriptionPage />);
    // PREMIUM user should see downgrade buttons
    const downgradeButtons = screen.getAllByTestId("downgrade-button");
    expect(downgradeButtons.length).toBe(3); // FREE, BASIC, STANDARD
  });

  it("calls scheduleDowngrade when downgrade button clicked", async () => {
    render(<SubscriptionPage />);

    const downgradeButtons = screen.getAllByTestId("downgrade-button");
    const firstDowngradeButton = downgradeButtons[0];
    if (!firstDowngradeButton) throw new Error("No downgrade button found");
    fireEvent.click(firstDowngradeButton); // Click first downgrade button (FREE)

    await waitFor(() => {
      expect(mockScheduleDowngrade).toHaveBeenCalledWith("FREE");
    });
  });
});

describe("SubscriptionPage - Scheduled downgrade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { user: { id: "1", name: "Test User" } },
      status: "authenticated",
    });
    // Set scheduled downgrade
    mockUseDowngrade.scheduledDowngrade = {
      targetTier: "FREE" as const,
      effectiveDate: new Date("2024-02-15"),
    };
  });

  afterEach(() => {
    mockUseDowngrade.scheduledDowngrade = null;
  });

  it("shows scheduled downgrade card", () => {
    render(<SubscriptionPage />);
    expect(screen.getByTestId("scheduled-downgrade-card")).toBeInTheDocument();
    expect(screen.getByText("Downgrade Scheduled")).toBeInTheDocument();
  });

  it("shows cancel downgrade button", () => {
    render(<SubscriptionPage />);
    expect(screen.getByTestId("cancel-downgrade-button")).toBeInTheDocument();
  });

  it("calls cancelDowngrade when cancel button clicked", async () => {
    render(<SubscriptionPage />);

    fireEvent.click(screen.getByTestId("cancel-downgrade-button"));

    await waitFor(() => {
      expect(mockCancelDowngrade).toHaveBeenCalled();
    });
  });

  it("does not show additional downgrade buttons when one is scheduled", () => {
    render(<SubscriptionPage />);
    // Even if user could downgrade, don't show buttons when one is scheduled
    expect(screen.queryAllByTestId("downgrade-button").length).toBe(0);
  });
});

describe("SubscriptionPage - Errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { user: { id: "1", name: "Test User" } },
      status: "authenticated",
    });
  });

  it("displays tier error", () => {
    mockUseTier.error = new Error("Failed to load tiers");

    render(<SubscriptionPage />);
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining("Failed to load tiers"),
      expect.any(Object),
    );

    mockUseTier.error = null;
  });

  it("displays upgrade error", () => {
    mockUseTierUpgrade.error = new Error("Upgrade failed");

    render(<SubscriptionPage />);
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining("Upgrade failed"),
      expect.any(Object),
    );

    mockUseTierUpgrade.error = null;
  });
});
