import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OverviewTab } from "./OverviewTab";
import { createFetchMock, mockOverviewData } from "@/test-utils/marketing-mocks";

// Mock Recharts
vi.mock("recharts", async (importOriginal) => {
  const original: any = await importOriginal();
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => <div className="recharts-responsive-container">{children}</div>,
    LineChart: ({ children }: any) => <div className="recharts-line-chart">{children}</div>,
    PieChart: ({ children }: any) => <div className="recharts-pie-chart">{children}</div>,
    Line: () => <div className="recharts-line" />,
    Pie: () => <div className="recharts-pie" />,
    XAxis: () => <div className="recharts-xaxis" />,
    YAxis: () => <div className="recharts-yaxis" />,
    Tooltip: () => <div className="recharts-tooltip" />,
    Legend: () => <div className="recharts-legend" />,
    Cell: () => <div className="recharts-cell" />,
  };
});

describe("OverviewTab", () => {
  beforeEach(() => {
    global.fetch = createFetchMock({
      "/api/admin/marketing/analytics/overview": mockOverviewData
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders overview tab with data", async () => {
    render(<OverviewTab />);

    await waitFor(() => {
        expect(screen.getByText("Visitors")).toBeInTheDocument();
        expect(screen.getByText("1,000")).toBeInTheDocument();
    });

    expect(screen.getByText("Signups")).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();

    expect(screen.getByText("Daily Trends")).toBeInTheDocument();
    expect(screen.getByText("Traffic Sources")).toBeInTheDocument();
  });

  it("handles loading state", () => {
    render(<OverviewTab />);
    // While loading, we shouldn't see the values yet
    expect(screen.queryByText("1,000")).not.toBeInTheDocument();
  });

  it("handles error state", async () => {
     global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error"
     });

     render(<OverviewTab />);

     await waitFor(() => {
        expect(screen.getByText(/Error:/)).toBeInTheDocument();
     });
  });

  it("toggles attribution model", async () => {
    render(<OverviewTab />);

    await waitFor(() => {
        expect(screen.getByText("First-touch")).toBeInTheDocument();
    });

    const lastTouchButton = screen.getByText("Last-touch");
    fireEvent.click(lastTouchButton);

    await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("attributionModel=LAST_TOUCH"));
    });
  });
});
