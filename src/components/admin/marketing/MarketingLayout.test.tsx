import { createFetchMock, mockMarketingData } from "@/test-utils/marketing-mocks";
import { fireEvent, render, screen } from "@testing-library/react";
import { usePathname, useSearchParams } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MarketingLayout, useMarketingData } from "./MarketingLayout";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
  useSearchParams: vi.fn(),
}));

describe("MarketingLayout", () => {
  const mockPathname = usePathname as any;
  const mockSearchParams = useSearchParams as any;
  const originalFetch = global.fetch;

  beforeEach(() => {
    mockPathname.mockReturnValue("/admin/marketing");
    mockSearchParams.mockReturnValue(new URLSearchParams());
    global.fetch = vi.fn(createFetchMock({
      "/api/admin/marketing/accounts": mockMarketingData,
    }));
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("renders layout with header and tabs", () => {
    render(
      <MarketingLayout initialData={mockMarketingData}>
        <div>Content</div>
      </MarketingLayout>,
    );

    expect(screen.getByText("Marketing")).toBeInTheDocument();
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Campaigns")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("highlights active tab", () => {
    mockPathname.mockReturnValue("/admin/marketing/campaigns");

    render(
      <MarketingLayout initialData={mockMarketingData}>
        <div>Content</div>
      </MarketingLayout>,
    );

    const campaignsTab = screen.getByText("Campaigns");
    expect(campaignsTab).toHaveClass("text-primary");

    const overviewTab = screen.getByText("Overview");
    expect(overviewTab).not.toHaveClass("text-primary");
  });

  it("toggles polling", () => {
    render(
      <MarketingLayout initialData={mockMarketingData}>
        <div>Content</div>
      </MarketingLayout>,
    );

    const pauseButton = screen.getByText("Pause");
    fireEvent.click(pauseButton);
    expect(screen.getByText("Resume")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Resume"));
    expect(screen.getByText("Pause")).toBeInTheDocument();
  });

  it("refreshes accounts manually", async () => {
    render(
      <MarketingLayout initialData={mockMarketingData}>
        <div>Content</div>
      </MarketingLayout>,
    );

    const refreshButton = screen.getByText("Refresh");
    fireEvent.click(refreshButton);

    expect(global.fetch).toHaveBeenCalledWith("/api/admin/marketing/accounts");
  });

  it("displays success notification from URL", () => {
    mockSearchParams.mockReturnValue(
      new URLSearchParams("success=Operation+successful"),
    );

    render(
      <MarketingLayout initialData={mockMarketingData}>
        <div>Content</div>
      </MarketingLayout>,
    );

    expect(screen.getByText("Operation successful")).toBeInTheDocument();
  });

  it("displays error notification from URL", () => {
    mockSearchParams.mockReturnValue(
      new URLSearchParams("error=Operation+failed"),
    );

    render(
      <MarketingLayout initialData={mockMarketingData}>
        <div>Content</div>
      </MarketingLayout>,
    );

    expect(screen.getByText("Operation failed")).toBeInTheDocument();
  });

  it("provides marketing data to children", () => {
    const TestChild = () => {
      const { data } = useMarketingData();
      return <div>Total Accounts: {data.summary.totalAccounts}</div>;
    };

    render(
      <MarketingLayout initialData={mockMarketingData}>
        <TestChild />
      </MarketingLayout>,
    );

    expect(screen.getByText("Total Accounts: 2")).toBeInTheDocument();
  });
});
