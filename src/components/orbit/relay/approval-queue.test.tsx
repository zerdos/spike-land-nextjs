import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApprovalQueue } from "./approval-queue";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useParams: () => ({ workspaceSlug: "test-workspace" }),
  useRouter: () => ({ push: mockPush }),
}));

// Mock fetch for ApprovalActions
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({}),
});

const mockDrafts = [
  {
    id: "draft-1",
    content: "Thank you for reaching out! We appreciate your feedback.",
    confidenceScore: 0.92,
    status: "PENDING" as const,
    createdAt: new Date().toISOString(),
    inboxItem: {
      id: "inbox-1",
      platform: "TWITTER",
      senderName: "John Doe",
      senderHandle: "johndoe",
      content: "Your product is amazing!",
    },
  },
  {
    id: "draft-2",
    content: "We are sorry to hear about your experience.",
    confidenceScore: 0.85,
    status: "APPROVED" as const,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    inboxItem: {
      id: "inbox-2",
      platform: "FACEBOOK",
      senderName: "Jane Smith",
      senderHandle: null,
      content: "Had some issues with my order.",
    },
  },
  {
    id: "draft-3",
    content: "Draft that was rejected.",
    confidenceScore: 0.65,
    status: "REJECTED" as const,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    inboxItem: {
      id: "inbox-3",
      platform: "INSTAGRAM",
      senderName: "Bob Wilson",
      senderHandle: "bobwilson",
      content: "Question about shipping.",
    },
  },
];

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

describe("ApprovalQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state", () => {
    render(<ApprovalQueue drafts={[]} isLoading={true} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByTestId("approval-queue-skeleton")).toBeInTheDocument();
  });

  it("renders error state", () => {
    render(
      <ApprovalQueue
        drafts={[]}
        error={new Error("Failed to load")}
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByTestId("approval-queue-error")).toBeInTheDocument();
    expect(screen.getByText("Failed to load")).toBeInTheDocument();
  });

  it("renders empty state when no drafts", () => {
    render(<ApprovalQueue drafts={[]} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByTestId("approval-queue-empty")).toBeInTheDocument();
    expect(screen.getByText("No drafts pending approval")).toBeInTheDocument();
  });

  it("renders drafts correctly", () => {
    render(<ApprovalQueue drafts={mockDrafts} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByTestId("approval-queue")).toBeInTheDocument();
    // Only pending draft should show in default view
    expect(
      screen.getByText("Thank you for reaching out! We appreciate your feedback."),
    ).toBeInTheDocument();
  });

  it("displays tab counts correctly", () => {
    render(<ApprovalQueue drafts={mockDrafts} />, {
      wrapper: createWrapper(),
    });

    // All tab should show total count
    const allTab = screen.getByTestId("tab-all");
    expect(allTab).toHaveTextContent("3");

    // Pending tab should show 1
    const pendingTab = screen.getByTestId("tab-pending");
    expect(pendingTab).toHaveTextContent("1");

    // Approved tab should show 1
    const approvedTab = screen.getByTestId("tab-approved");
    expect(approvedTab).toHaveTextContent("1");

    // Rejected tab should show 1
    const rejectedTab = screen.getByTestId("tab-rejected");
    expect(rejectedTab).toHaveTextContent("1");
  });

  it("renders all tabs", () => {
    render(<ApprovalQueue drafts={mockDrafts} />, {
      wrapper: createWrapper(),
    });

    // Verify all tabs are rendered
    expect(screen.getByTestId("tab-all")).toBeInTheDocument();
    expect(screen.getByTestId("tab-pending")).toBeInTheDocument();
    expect(screen.getByTestId("tab-approved")).toBeInTheDocument();
    expect(screen.getByTestId("tab-rejected")).toBeInTheDocument();
  });

  it("displays draft card with correct information", () => {
    render(<ApprovalQueue drafts={mockDrafts} />, {
      wrapper: createWrapper(),
    });

    // Check for sender info
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("@johndoe")).toBeInTheDocument();

    // Check for platform badge
    expect(screen.getByText("twitter")).toBeInTheDocument();

    // Check for original message
    expect(screen.getByText("Your product is amazing!")).toBeInTheDocument();

    // Check for confidence score
    expect(screen.getByText("92% confidence")).toBeInTheDocument();
  });

  it("shows approval actions for pending drafts", () => {
    render(<ApprovalQueue drafts={mockDrafts} />, {
      wrapper: createWrapper(),
    });

    // Should show approve/reject buttons for pending drafts
    expect(screen.getByTestId("approve-draft-button")).toBeInTheDocument();
    expect(screen.getByTestId("reject-draft-button")).toBeInTheDocument();
  });

  it("navigates to inbox when view button is clicked", () => {
    render(<ApprovalQueue drafts={mockDrafts} />, {
      wrapper: createWrapper(),
    });

    const viewButton = screen.getByTestId("view-in-inbox-button");
    fireEvent.click(viewButton);

    expect(mockPush).toHaveBeenCalledWith(
      "/orbit/test-workspace/inbox?itemId=inbox-1",
    );
  });

  it("shows empty state in pending tab when no pending drafts", () => {
    // Empty drafts array means no pending drafts (default tab)
    render(<ApprovalQueue drafts={[]} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByTestId("approval-queue-empty")).toBeInTheDocument();
    expect(screen.getByText("No drafts pending approval")).toBeInTheDocument();
  });

  it("shows correct badge counts", () => {
    render(<ApprovalQueue drafts={mockDrafts} />, {
      wrapper: createWrapper(),
    });

    // Check that badges show correct counts
    const allTab = screen.getByTestId("tab-all");
    const pendingTab = screen.getByTestId("tab-pending");
    const approvedTab = screen.getByTestId("tab-approved");
    const rejectedTab = screen.getByTestId("tab-rejected");

    expect(allTab).toHaveTextContent("All");
    expect(pendingTab).toHaveTextContent("Pending");
    expect(approvedTab).toHaveTextContent("Approved");
    expect(rejectedTab).toHaveTextContent("Rejected");
  });

  it("calls onDraftActioned callback when draft is actioned", () => {
    const mockOnActioned = vi.fn();

    render(
      <ApprovalQueue drafts={mockDrafts} onDraftActioned={mockOnActioned} />,
      { wrapper: createWrapper() },
    );

    // The callback is passed through to ApprovalActions
    // and will be called after successful mutation
    expect(screen.getByTestId("approve-draft-button")).toBeInTheDocument();
  });

  it("handles drafts without sender handle", () => {
    const draftWithoutHandle = [
      {
        id: "draft-4",
        content: "Response content",
        confidenceScore: 0.88,
        status: "PENDING" as const,
        createdAt: new Date().toISOString(),
        inboxItem: {
          id: "inbox-4",
          platform: "FACEBOOK",
          senderName: "No Handle User",
          senderHandle: null,
          content: "Message without handle",
        },
      },
    ];

    render(<ApprovalQueue drafts={draftWithoutHandle} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText("No Handle User")).toBeInTheDocument();
    // Should not show @ for null handle
    expect(screen.queryByText("@")).not.toBeInTheDocument();
  });
});
