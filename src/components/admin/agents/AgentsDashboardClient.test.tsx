import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentsDashboardClient } from "./AgentsDashboardClient";
import { createFetchMock } from "@/test-utils/marketing-mocks";

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
    }
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
            "/api/admin/agents/sess_2/approve-plan": { success: true }
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("renders dashboard header and stats", () => {
        render(<AgentsDashboardClient initialData={mockAgentsData} />);

        expect(screen.getByText("Agents Dashboard")).toBeInTheDocument();
        expect(screen.getByText("Active Agents")).toBeInTheDocument();
        // Check for stats
        expect(screen.getByText("2", { selector: ".text-cyan-600" })).toBeInTheDocument(); // Active count
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
            expect(global.fetch).toHaveBeenCalledWith("/api/admin/agents/sess_2/approve-plan", expect.objectContaining({
                method: "POST"
            }));
        });
    });

    it("toggles session details", () => {
        render(<AgentsDashboardClient initialData={mockAgentsData} />);

        const expandBtn = screen.getAllByText("▼")[0];
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
});
