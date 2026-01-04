import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

// Mock the useWorkspace hook
const mockSwitchWorkspace = vi.fn();
const mockUseWorkspace = vi.fn();

vi.mock("./WorkspaceContext", () => ({
  useWorkspace: () => mockUseWorkspace(),
}));

describe("WorkspaceSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loading state", () => {
    it("shows loading state when isLoading is true", () => {
      mockUseWorkspace.mockReturnValue({
        workspace: null,
        workspaces: [],
        isLoading: true,
        error: null,
        switchWorkspace: mockSwitchWorkspace,
        refetch: vi.fn(),
      });

      render(<WorkspaceSwitcher />);

      const loadingButton = screen.getByTestId("workspace-switcher-loading");
      expect(loadingButton).toBeInTheDocument();
      expect(loadingButton).toBeDisabled();
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("shows empty state when no workspace is selected", () => {
      mockUseWorkspace.mockReturnValue({
        workspace: null,
        workspaces: [],
        isLoading: false,
        error: null,
        switchWorkspace: mockSwitchWorkspace,
        refetch: vi.fn(),
      });

      render(<WorkspaceSwitcher />);

      const emptyButton = screen.getByTestId("workspace-switcher-empty");
      expect(emptyButton).toBeInTheDocument();
      expect(emptyButton).toBeDisabled();
      expect(screen.getByText("No workspace")).toBeInTheDocument();
    });
  });

  describe("with workspace data", () => {
    const mockWorkspaces = [
      {
        id: "ws-1",
        name: "Personal Workspace",
        slug: "personal-workspace",
        description: "My personal workspace",
        avatarUrl: "https://example.com/avatar1.jpg",
        isPersonal: true,
        role: "OWNER" as const,
      },
      {
        id: "ws-2",
        name: "Team Workspace",
        slug: "team-workspace",
        description: "Our team workspace",
        avatarUrl: null,
        isPersonal: false,
        role: "MEMBER" as const,
      },
    ];

    it("displays current workspace name", () => {
      mockUseWorkspace.mockReturnValue({
        workspace: mockWorkspaces[0],
        workspaces: mockWorkspaces,
        isLoading: false,
        error: null,
        switchWorkspace: mockSwitchWorkspace,
        refetch: vi.fn(),
      });

      render(<WorkspaceSwitcher />);

      expect(screen.getByText("Personal Workspace")).toBeInTheDocument();
    });

    it("shows avatar with fallback for personal workspace", () => {
      mockUseWorkspace.mockReturnValue({
        workspace: { ...mockWorkspaces[0], avatarUrl: null },
        workspaces: mockWorkspaces,
        isLoading: false,
        error: null,
        switchWorkspace: mockSwitchWorkspace,
        refetch: vi.fn(),
      });

      render(<WorkspaceSwitcher />);

      // Personal workspace shows "Me" as fallback
      expect(screen.getByText("Me")).toBeInTheDocument();
    });

    it("shows avatar with initials for team workspace", () => {
      mockUseWorkspace.mockReturnValue({
        workspace: mockWorkspaces[1],
        workspaces: mockWorkspaces,
        isLoading: false,
        error: null,
        switchWorkspace: mockSwitchWorkspace,
        refetch: vi.fn(),
      });

      render(<WorkspaceSwitcher />);

      // Team workspace shows first 2 letters
      expect(screen.getByText("TE")).toBeInTheDocument();
    });

    it("opens dropdown menu on click", async () => {
      const user = userEvent.setup();

      mockUseWorkspace.mockReturnValue({
        workspace: mockWorkspaces[0],
        workspaces: mockWorkspaces,
        isLoading: false,
        error: null,
        switchWorkspace: mockSwitchWorkspace,
        refetch: vi.fn(),
      });

      render(<WorkspaceSwitcher />);

      const trigger = screen.getByTestId("workspace-switcher-trigger");
      await user.click(trigger);

      expect(screen.getByText("Workspaces")).toBeInTheDocument();
      expect(screen.getByTestId("workspace-option-personal-workspace")).toBeInTheDocument();
      expect(screen.getByTestId("workspace-option-team-workspace")).toBeInTheDocument();
    });

    it("shows checkmark for active workspace", async () => {
      const user = userEvent.setup();

      mockUseWorkspace.mockReturnValue({
        workspace: mockWorkspaces[0],
        workspaces: mockWorkspaces,
        isLoading: false,
        error: null,
        switchWorkspace: mockSwitchWorkspace,
        refetch: vi.fn(),
      });

      render(<WorkspaceSwitcher />);

      const trigger = screen.getByTestId("workspace-switcher-trigger");
      await user.click(trigger);

      expect(screen.getByTestId("workspace-active-check")).toBeInTheDocument();
    });

    it("shows Personal label for personal workspace in dropdown", async () => {
      const user = userEvent.setup();

      mockUseWorkspace.mockReturnValue({
        workspace: mockWorkspaces[0],
        workspaces: mockWorkspaces,
        isLoading: false,
        error: null,
        switchWorkspace: mockSwitchWorkspace,
        refetch: vi.fn(),
      });

      render(<WorkspaceSwitcher />);

      const trigger = screen.getByTestId("workspace-switcher-trigger");
      await user.click(trigger);

      expect(screen.getByText("Personal")).toBeInTheDocument();
    });

    it("calls switchWorkspace when clicking a different workspace", async () => {
      const user = userEvent.setup();

      mockUseWorkspace.mockReturnValue({
        workspace: mockWorkspaces[0],
        workspaces: mockWorkspaces,
        isLoading: false,
        error: null,
        switchWorkspace: mockSwitchWorkspace,
        refetch: vi.fn(),
      });

      render(<WorkspaceSwitcher />);

      const trigger = screen.getByTestId("workspace-switcher-trigger");
      await user.click(trigger);

      const teamOption = screen.getByTestId("workspace-option-team-workspace");
      await user.click(teamOption);

      expect(mockSwitchWorkspace).toHaveBeenCalledWith("team-workspace");
    });

    it("shows Create Workspace option (disabled)", async () => {
      const user = userEvent.setup();

      mockUseWorkspace.mockReturnValue({
        workspace: mockWorkspaces[0],
        workspaces: mockWorkspaces,
        isLoading: false,
        error: null,
        switchWorkspace: mockSwitchWorkspace,
        refetch: vi.fn(),
      });

      render(<WorkspaceSwitcher />);

      const trigger = screen.getByTestId("workspace-switcher-trigger");
      await user.click(trigger);

      const createOption = screen.getByTestId("create-workspace-option");
      expect(createOption).toBeInTheDocument();
      expect(screen.getByText("Create Workspace")).toBeInTheDocument();
    });
  });

  describe("with single workspace", () => {
    it("still shows dropdown with single workspace option", async () => {
      const user = userEvent.setup();

      const singleWorkspace = {
        id: "ws-1",
        name: "Only Workspace",
        slug: "only-workspace",
        description: null,
        avatarUrl: null,
        isPersonal: true,
        role: "OWNER" as const,
      };

      mockUseWorkspace.mockReturnValue({
        workspace: singleWorkspace,
        workspaces: [singleWorkspace],
        isLoading: false,
        error: null,
        switchWorkspace: mockSwitchWorkspace,
        refetch: vi.fn(),
      });

      render(<WorkspaceSwitcher />);

      const trigger = screen.getByTestId("workspace-switcher-trigger");
      await user.click(trigger);

      expect(screen.getByTestId("workspace-option-only-workspace")).toBeInTheDocument();
    });
  });
});
