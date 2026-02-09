
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PhotoMixClient } from "./PhotoMixClient";

// Mock hooks
vi.mock("@/hooks/useWorkspaceCredits", () => ({
  useWorkspaceCredits: vi.fn(),
}));

vi.mock("@/hooks/useMixHistory", () => ({
  useMixHistory: vi.fn(),
}));

vi.mock("next-view-transitions", () => ({
  useTransitionRouter: () => ({
    push: vi.fn(),
  }),
  Link: (props: any) => <a {...props}>{props.children}</a>, 
}));

// Mock ImageSlot to avoid complex rendering
vi.mock("@/components/mix", () => ({
  ImageSlot: ({ label }: { label: string }) => <div data-testid="image-slot">{label}</div>,
  ImageSelectorDialog: () => <div data-testid="image-selector-dialog" />,
  MixHistory: () => <div data-testid="mix-history" />,
  MixResultCard: () => <div data-testid="mix-result-card" />,
}));

import { useWorkspaceCredits } from "@/hooks/useWorkspaceCredits";
import { useMixHistory } from "@/hooks/useMixHistory";

describe("PhotoMixClient", () => {
  const mockUseWorkspaceCredits = useWorkspaceCredits as unknown as ReturnType<typeof vi.fn>;
  const mockUseMixHistory = useMixHistory as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseWorkspaceCredits.mockReturnValue({
      remaining: 100,
      isLowCredits: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    mockUseMixHistory.mockReturnValue({
      refetch: vi.fn(),
    });
  });

  it("renders Nano Banana as the free tier option", () => {
    render(<PhotoMixClient />);
    const nanoBananaElements = screen.getAllByText("Nano Banana");
    expect(nanoBananaElements.length).toBeGreaterThan(0);
    expect(screen.queryByText("Free (Nano)")).toBeNull(); // Old text should be gone
  });

  it("renders Nano Banana Pro as the premium tier option", () => {
    render(<PhotoMixClient />);
    const proElements = screen.getAllByText("Nano Banana Pro");
    expect(proElements.length).toBeGreaterThan(0);
  });

  it("displays credit cost instead of tokens", () => {
    render(<PhotoMixClient />);
    
    // Select premium tier
    const premiumBtn = screen.getByRole('button', { name: /Nano Banana Pro/i });
    fireEvent.click(premiumBtn);

    // The button text contains "(2 AI credits)"
    expect(screen.getByText(/2 AI credits/)).toBeInTheDocument(); 
    expect(screen.queryByText("tokens")).not.toBeInTheDocument();
  });

  it("shows anonymous user view correctly", () => {
    render(<PhotoMixClient isAnonymous={true} />);
    
    // Should show sign in prompt (Alert)
    expect(screen.getByText(/save your creations/)).toBeInTheDocument();
    
    // Check that Nano Banana is mentioned
    const nanoElements = screen.getAllByText("Nano Banana");
    expect(nanoElements.length).toBeGreaterThan(0);
    
    // Should NOT show the tier selector buttons which contain "Nano Banana Pro"
    expect(screen.queryByRole('button', { name: /Nano Banana Pro/i })).not.toBeInTheDocument();
    
    // But it should show the Quality Options explanation
    expect(screen.getByText(/1K quality for better results/)).toBeInTheDocument();
  });

  it("shows insufficient credits warning when applicable", () => {
    mockUseWorkspaceCredits.mockReturnValue({
      remaining: 0,
      isLowCredits: true,
      isLoading: false,
      refetch: vi.fn(),
    });

    render(<PhotoMixClient />);
    
    // Select premium tier
    const premiumBtn = screen.getByRole('button', { name: /Nano Banana Pro/i });
    fireEvent.click(premiumBtn);

    // Use getAllByText to handle potential duplicates (though there shouldn't be validly 2)
    // or just make sure at least one exists.
    expect(screen.getAllByText("Insufficient AI Credits").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/You need 2 credits for Nano Banana Pro/).length).toBeGreaterThan(0);
  });
});
