import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PurchaseModal } from "./PurchaseModal";

// Mock the PackageCard component
vi.mock("./PackageCard", () => ({
  PackageCard: ({ id, name, tokens, price, currencySymbol, onSelect, isLoading }: {
    id: string;
    name: string;
    tokens: number;
    price: number;
    currencySymbol: string;
    onSelect: (id: string) => void;
    isLoading: boolean;
  }) => (
    <div data-testid={`package-card-${id}`}>
      <div>{name}</div>
      <div>{tokens} tokens</div>
      <div>{currencySymbol}{price}</div>
      <button onClick={() => onSelect(id)} disabled={isLoading}>
        {isLoading ? "Processing..." : "Buy"}
      </button>
    </div>
  ),
}));

// Mock the VoucherInput component
vi.mock("./VoucherInput", () => ({
  VoucherInput: ({ onRedeemed }: { onRedeemed: () => void; }) => (
    <div data-testid="voucher-input">
      <button onClick={onRedeemed}>Redeem</button>
    </div>
  ),
}));

// Mock the stripe client config
vi.mock("@/lib/stripe/client", () => ({
  TOKEN_PACKAGES: {
    starter: { tokens: 10, price: 2.99, name: "Starter Pack" },
    basic: { tokens: 50, price: 9.99, name: "Basic Pack" },
    pro: { tokens: 150, price: 24.99, name: "Pro Pack" },
    power: { tokens: 500, price: 69.99, name: "Power Pack" },
  },
  CURRENCY: {
    code: "GBP",
    symbol: "£",
  },
}));

// Mock lucide-react
vi.mock("lucide-react", () => ({
  Coins: () => <div data-testid="coins-icon">Coins</div>,
}));

describe("PurchaseModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("renders with default trigger button", () => {
    render(<PurchaseModal />);
    expect(screen.getByText("Get Tokens")).toBeInTheDocument();
  });

  it("renders with custom trigger", () => {
    render(
      <PurchaseModal trigger={<button>Custom Trigger</button>} />,
    );
    expect(screen.getByText("Custom Trigger")).toBeInTheDocument();
  });

  it("opens modal when trigger is clicked", async () => {
    render(<PurchaseModal />);

    const trigger = screen.getByText("Get Tokens");
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText("Get More Tokens")).toBeInTheDocument();
    });
  });

  it("renders all token packages when modal is open", async () => {
    render(<PurchaseModal />);

    fireEvent.click(screen.getByText("Get Tokens"));

    await waitFor(() => {
      expect(screen.getByText("Starter Pack")).toBeInTheDocument();
      expect(screen.getByText("Basic Pack")).toBeInTheDocument();
      expect(screen.getByText("Pro Pack")).toBeInTheDocument();
      expect(screen.getByText("Power Pack")).toBeInTheDocument();
    });
  });

  it("marks basic package as popular", async () => {
    render(<PurchaseModal />);

    fireEvent.click(screen.getByText("Get Tokens"));

    await waitFor(() => {
      const basicCard = screen.getByTestId("package-card-basic");
      expect(basicCard).toBeInTheDocument();
    });
  });

  it("renders voucher input section", async () => {
    render(<PurchaseModal />);

    fireEvent.click(screen.getByText("Get Tokens"));

    await waitFor(() => {
      expect(screen.getByTestId("voucher-input")).toBeInTheDocument();
    });
  });

  it("calls checkout API when package is selected", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: async () => ({ url: "https://checkout.stripe.com/test" }),
    });
    global.fetch = mockFetch;

    render(<PurchaseModal />);
    fireEvent.click(screen.getByText("Get Tokens"));

    await waitFor(() => {
      const buyButton = screen.getAllByText("Buy")[0];
      fireEvent.click(buyButton);
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        packageId: "starter",
        mode: "payment",
      }),
    });
  });

  it("redirects to checkout URL on successful purchase", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: async () => ({ url: "https://checkout.stripe.com/test" }),
    });
    global.fetch = mockFetch;

    const originalLocation = window.location;
    delete (window as { location?: typeof window.location; }).location;
    window.location = { ...originalLocation, href: "" } as typeof window.location;

    render(<PurchaseModal />);
    fireEvent.click(screen.getByText("Get Tokens"));

    await waitFor(() => {
      const buyButton = screen.getAllByText("Buy")[0];
      fireEvent.click(buyButton);
    });

    await waitFor(() => {
      expect(window.location.href).toBe("https://checkout.stripe.com/test");
    });

    window.location = originalLocation;
  });

  it("handles checkout error gracefully", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
    global.fetch = mockFetch;

    render(<PurchaseModal />);
    fireEvent.click(screen.getByText("Get Tokens"));

    await waitFor(() => {
      const buyButton = screen.getAllByText("Buy")[0];
      fireEvent.click(buyButton);
    });

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith("Checkout error:", expect.any(Error));
    });

    consoleErrorSpy.mockRestore();
  });

  it("handles missing checkout URL gracefully", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const mockFetch = vi.fn().mockResolvedValue({
      json: async () => ({}),
    });
    global.fetch = mockFetch;

    render(<PurchaseModal />);
    fireEvent.click(screen.getByText("Get Tokens"));

    await waitFor(() => {
      const buyButton = screen.getAllByText("Buy")[0];
      fireEvent.click(buyButton);
    });

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith("No checkout URL returned");
    });

    consoleErrorSpy.mockRestore();
  });

  it("shows loading state for selected package", async () => {
    const mockFetch = vi.fn().mockImplementation(() => new Promise(() => {}));
    global.fetch = mockFetch;

    render(<PurchaseModal />);
    fireEvent.click(screen.getByText("Get Tokens"));

    await waitFor(() => {
      const buyButton = screen.getAllByText("Buy")[0];
      fireEvent.click(buyButton);
    });

    await waitFor(() => {
      expect(screen.getByText("Processing...")).toBeInTheDocument();
    });
  });

  it("closes modal and calls onPurchaseComplete when voucher is redeemed", async () => {
    const onPurchaseComplete = vi.fn();
    render(<PurchaseModal onPurchaseComplete={onPurchaseComplete} />);

    fireEvent.click(screen.getByText("Get Tokens"));

    await waitFor(() => {
      const redeemButton = screen.getByText("Redeem");
      fireEvent.click(redeemButton);
    });

    await waitFor(() => {
      expect(onPurchaseComplete).toHaveBeenCalled();
    });
  });

  it("renders dialog description", async () => {
    render(<PurchaseModal />);

    fireEvent.click(screen.getByText("Get Tokens"));

    await waitFor(() => {
      expect(screen.getByText("Choose a token package or redeem a voucher code"))
        .toBeInTheDocument();
    });
  });

  it('renders "or purchase tokens" divider', async () => {
    render(<PurchaseModal />);

    fireEvent.click(screen.getByText("Get Tokens"));

    await waitFor(() => {
      expect(screen.getByText("or purchase tokens")).toBeInTheDocument();
    });
  });
});
