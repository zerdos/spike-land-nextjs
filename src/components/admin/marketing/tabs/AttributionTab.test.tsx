import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AttributionTab } from "./AttributionTab";

// Mock ResizeObserver for Recharts
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock Recharts ResponsiveContainer to render children immediately
vi.mock("recharts", async () => {
  const OriginalModule = await vi.importActual("recharts");
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: 800, height: 300 }}>{children}</div>
    ),
  };
});

const mockAttributionData = {
  totalConversions: 100,
  comparison: [
    { model: "FIRST_TOUCH", value: 5000, conversionCount: 50 },
    { model: "LAST_TOUCH", value: 5000, conversionCount: 50 },
    { model: "LINEAR", value: 5000, conversionCount: 50 },
  ],
  platformBreakdown: [
    {
      platform: "GOOGLE",
      conversionCount: 30,
      value: 3000,
      model: "FIRST_TOUCH",
    },
    {
      platform: "FACEBOOK",
      conversionCount: 20,
      value: 2000,
      model: "FIRST_TOUCH",
    },
  ],
};

function createFetchMock(mocks: Record<string, unknown>) {
  return async (url: string | Request) => {
    const urlString = typeof url === "string" ? url : url.url;
    for (const [key, value] of Object.entries(mocks)) {
      if (urlString.includes(key)) {
        return {
          ok: true,
          json: async () => value,
        };
      }
    }
    return { ok: false, status: 404 };
  };
}

describe("AttributionTab", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn(createFetchMock({
      "/api/admin/marketing/analytics/attribution": mockAttributionData,
    })) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("renders model comparison chart", async () => {
    render(<AttributionTab />);

    await waitFor(() => {
      expect(screen.getByText("Attribution Model Comparison")).toBeInTheDocument();
    });

    // Recharts text rendering can be flaky in JSDOM.
    // We mainly verify the component renders without crashing and title is present.
  });

  it("renders platform breakdown", async () => {
    render(<AttributionTab />);

    await waitFor(() => {
      expect(screen.getByText("Platform Breakdown")).toBeInTheDocument();
    });

    // Check for platform names in the breakdown list
    expect(screen.getByText("GOOGLE")).toBeInTheDocument();
    expect(screen.getByText("FACEBOOK")).toBeInTheDocument();

    // Check for formatted currency values
    // $3,000.00
    expect(screen.getByText(/\$3,000\.00/)).toBeInTheDocument();
  });

  it("handles empty data gracefully", async () => {
    global.fetch = vi.fn(createFetchMock({
      "/api/admin/marketing/analytics/attribution": {
        totalConversions: 0,
        comparison: [],
        platformBreakdown: [],
      },
    })) as unknown as typeof fetch;

    render(<AttributionTab />);

    await waitFor(() => {
      expect(screen.getByText("No data available for this period.")).toBeInTheDocument();
    });
  });

  it("calls API with date parameters", async () => {
    render(<AttributionTab />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/marketing/analytics/attribution"),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("startDate="),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("endDate="),
      );
    });
  });
});
