import { createFetchMock } from "@/test-utils/marketing-mocks";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentsDashboardClient } from "./AgentsDashboardClient";

const mockResourcesData = {
  resources: {
    devServer: { running: true, port: 3000, url: "http://localhost:3000" },
    mcpServers: [
      { name: "playwright", type: "stdio", configured: true },
      { name: "docker", type: "stdio", configured: false },
    ],
    database: { connected: true, provider: "postgresql" },
    environment: {
      nodeEnv: "development",
      julesConfigured: true,
      githubConfigured: true,
    },
  },
  checkedAt: "2023-01-01T12:00:00Z",
};

const mockGitInfoData = {
  repository: "owner/repo",
  branch: "main",
  baseBranch: "main",
  changedFiles: [{ path: "file.ts", status: "modified" }],
  uncommittedChanges: 1,
  aheadBy: 2,
  behindBy: 0,
  lastCommit: {
    hash: "abc1234",
    message: "test commit",
    author: "test",
    date: "2023-01-01",
  },
  timestamp: "2023-01-01T12:00:00Z",
};

const mockGitHubData = {
  issues: [
    {
      number: 1,
      title: "Fix bug",
      state: "open",
      labels: [],
      createdAt: "2023-01-01",
      url: "https://github.com",
    },
  ],
  workflows: [
    {
      id: 1,
      name: "CI",
      status: "completed",
      conclusion: "success",
      createdAt: "2023-01-01",
      url: "https://github.com",
    },
  ],
  githubConfigured: true,
  timestamp: "2023-01-01T12:00:00Z",
};

const mockAgentsData: any = {
  sessions: [
    {
      id: "sess_1",
      externalId: "ext_1",
      provider: "Jules",
      name: "Agent 1",
      description: "Description 1",
      status: "IN_PROGRESS",
      sourceRepo: "owner/repo",
      startingBranch: "main",
      outputBranch: "jules/test",
      pullRequestUrl: null,
      planSummary: "Plan summary",
      planApprovedAt: "2023-01-01T12:00:00Z",
      lastActivityAt: "2023-01-01T12:00:00Z",
      errorMessage: null,
      metadata: { julesUrl: "http://example.com" },
      createdAt: "2023-01-01T10:00:00Z",
      updatedAt: "2023-01-01T12:00:00Z",
      activityCount: 5,
    },
    {
      id: "sess_2",
      externalId: "ext_2",
      provider: "Other",
      name: "Agent 2",
      description: null,
      status: "AWAITING_PLAN_APPROVAL",
      sourceRepo: null,
      startingBranch: null,
      outputBranch: null,
      pullRequestUrl: null,
      planSummary: "Waiting for approval",
      planApprovedAt: null,
      lastActivityAt: null,
      errorMessage: null,
      metadata: null,
      createdAt: "2023-01-01T11:00:00Z",
      updatedAt: "2023-01-01T11:00:00Z",
      activityCount: 0,
    },
  ],
  pagination: {
    total: 2,
    limit: 10,
    offset: 0,
    hasMore: false,
  },
  statusCounts: {
    IN_PROGRESS: 1,
    AWAITING_PLAN_APPROVAL: 1,
  },
  julesAvailable: true,
  error: null,
};

describe("AgentsDashboardClient", () => {
  beforeEach(() => {
    global.fetch = createFetchMock({
      "/api/admin/agents": mockAgentsData,
      "/api/admin/agents/sess_2/approve-plan": { success: true },
      "/api/admin/agents/resources": mockResourcesData,
      "/api/admin/agents/git": mockGitInfoData,
      "/api/admin/agents/github/issues": mockGitHubData,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders dashboard header and stats", () => {
    render(<AgentsDashboardClient initialData={mockAgentsData} />);

    expect(screen.getByText("Agents Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
    // Check for stats
    expect(screen.getByText("2", { selector: ".text-cyan-600" }))
      .toBeInTheDocument(); // Active count
  });

  it("renders agent sessions", () => {
    render(<AgentsDashboardClient initialData={mockAgentsData} />);

    expect(screen.getByText("Agent 1")).toBeInTheDocument();
    expect(screen.getByText("Agent 2")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getAllByText("Awaiting Approval")[0]).toBeInTheDocument();
  });

  it("approves plan", async () => {
    render(<AgentsDashboardClient initialData={mockAgentsData} />);

    const approveBtn = screen.getByText("Approve Plan");
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/agents/sess_2/approve-plan",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });
  });

  it("toggles session details", () => {
    render(<AgentsDashboardClient initialData={mockAgentsData} />);

    const expandBtn = screen.getAllByText("▼")[0]!;
    fireEvent.click(expandBtn);

    expect(screen.getByText("Plan Summary")).toBeInTheDocument();
  });

  it("opens create modal", () => {
    render(<AgentsDashboardClient initialData={mockAgentsData} />);

    fireEvent.click(screen.getByText("+ New Task"));

    expect(screen.getByText("Create New Jules Task")).toBeInTheDocument();

    const cancelBtn = screen.getByText("Cancel");
    fireEvent.click(cancelBtn);

    expect(screen.queryByText("Create New Jules Task")).not.toBeInTheDocument();
  });

  it("renders View PR button when PR URL is present", () => {
    const dataWithPR = {
      ...mockAgentsData,
      sessions: [
        {
          ...mockAgentsData.sessions[0],
          pullRequestUrl: "https://github.com/owner/repo/pull/1",
        },
      ],
    };

    render(<AgentsDashboardClient initialData={dataWithPR} />);

    // Check that View PR button is rendered when PR URL is present
    expect(screen.getByText("View PR")).toBeInTheDocument();
    const viewPrLink = screen.getByText("View PR").closest("a");
    expect(viewPrLink).toHaveAttribute(
      "href",
      "https://github.com/owner/repo/pull/1",
    );
  });

  it("renders Resources panel with data", async () => {
    render(<AgentsDashboardClient initialData={mockAgentsData} />);

    await waitFor(() => {
      expect(screen.getByText("Resources")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText("Dev Server")).toBeInTheDocument();
      expect(screen.getByText("Running")).toBeInTheDocument();
      expect(screen.getByText("Database")).toBeInTheDocument();
    });
  });

  it("renders Git Info panel with data", async () => {
    render(<AgentsDashboardClient initialData={mockAgentsData} />);

    await waitFor(() => {
      expect(screen.getByText("Git Info")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText("Branch")).toBeInTheDocument();
      expect(screen.getByText("main")).toBeInTheDocument();
      expect(screen.getByText("Changed files")).toBeInTheDocument();
    });
  });

  it("renders GitHub Issues panel with data", async () => {
    render(<AgentsDashboardClient initialData={mockAgentsData} />);

    await waitFor(() => {
      expect(screen.getByText("GitHub Issues")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText("Open Issues")).toBeInTheDocument();
      expect(screen.getByText("Recent Workflow Runs")).toBeInTheDocument();
    });
  });

  it("renders sessions list with data-testid", () => {
    render(<AgentsDashboardClient initialData={mockAgentsData} />);

    const sessionsList = screen.getByTestId("sessions-list");
    expect(sessionsList).toBeInTheDocument();
  });

  it("renders timestamp with data-testid", () => {
    render(<AgentsDashboardClient initialData={mockAgentsData} />);

    const timestamp = screen.getByTestId("timestamp");
    expect(timestamp).toBeInTheDocument();
  });
});
