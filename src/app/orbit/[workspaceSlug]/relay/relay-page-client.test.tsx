import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RelayPageClient } from "./relay-page-client";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useParams: () => ({ workspaceSlug: "test-workspace" }),
  useRouter: () => ({ push: vi.fn() }),
}));

const mockDrafts = [
  {
    id: "draft-1",
    content: "Thank you for your message!",
    confidenceScore: 0.92,
    status: "PENDING",
    createdAt: new Date().toISOString(),
    inboxItem: {
      id: "inbox-1",
      platform: "TWITTER",
      senderName: "John Doe",
      senderHandle: "johndoe",
      content: "Original message",
    },
  },
];

const mockMetrics = {
  pending: 5,
  approved: 20,
  rejected: 3,
  sent: 15,
  averageApprovalTime: 12.5,
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode; }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("RelayPageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/relay/drafts")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockDrafts),
        });
      }
      if (url.includes("/relay/metrics")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMetrics),
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: "Not found" }),
      });
    });
  });

  it("renders the page header", async () => {
    render(<RelayPageClient workspaceSlug="test-workspace" />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText("Relay")).toBeInTheDocument();
    expect(
      screen.getByText("Review and approve AI-generated response drafts"),
    ).toBeInTheDocument();
  });

  it("renders the settings link", async () => {
    render(<RelayPageClient workspaceSlug="test-workspace" />, {
      wrapper: createWrapper(),
    });

    const settingsLink = screen.getByTestId("settings-link");
    expect(settingsLink).toBeInTheDocument();
    expect(settingsLink).toHaveAttribute(
      "href",
      "/orbit/test-workspace/settings/approvals",
    );
  });

  it("displays metrics cards", async () => {
    render(<RelayPageClient workspaceSlug="test-workspace" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByTestId("relay-metrics")).toBeInTheDocument();
    });

    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("Rejected")).toBeInTheDocument();
    expect(screen.getByText("Avg. Approval Time")).toBeInTheDocument();
  });

  it("displays metric values", async () => {
    render(<RelayPageClient workspaceSlug="test-workspace" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("5")).toBeInTheDocument();
    });

    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("13 min")).toBeInTheDocument();
  });

  it("renders the approval queue section", async () => {
    render(<RelayPageClient workspaceSlug="test-workspace" />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText("Approval Queue")).toBeInTheDocument();
    expect(
      screen.getByText("Drafts awaiting review and approval"),
    ).toBeInTheDocument();
  });

  it("loads drafts into approval queue", async () => {
    render(<RelayPageClient workspaceSlug="test-workspace" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByTestId("approval-queue")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Thank you for your message!"),
    ).toBeInTheDocument();
  });

  it("shows pending count badge", async () => {
    render(<RelayPageClient workspaceSlug="test-workspace" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("1 pending")).toBeInTheDocument();
    });
  });

  it("handles API errors gracefully", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/relay/drafts")) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: "Failed to load drafts" }),
        });
      }
      if (url.includes("/relay/metrics")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMetrics),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<RelayPageClient workspaceSlug="test-workspace" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByTestId("approval-queue-error")).toBeInTheDocument();
    });
  });

  it("fetches data with correct workspace slug", async () => {
    render(<RelayPageClient workspaceSlug="my-workspace" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/orbit/my-workspace/relay/drafts"),
      );
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/orbit/my-workspace/relay/metrics"),
    );
  });
});
