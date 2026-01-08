import type { WorkspaceRole } from "@prisma/client";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PermissionGate, withPermission } from "./PermissionGate";

// Mock the usePermission hook
const mockUsePermission = vi.fn();

vi.mock("@/hooks/usePermission", () => ({
  usePermission: () => mockUsePermission(),
}));

describe("PermissionGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("basic rendering", () => {
    it("renders children when user has permission", () => {
      mockUsePermission.mockReturnValue({
        can: true,
        role: "ADMIN" as WorkspaceRole,
        isLoading: false,
      });

      render(
        <PermissionGate action="content:create">
          <button>Create Content</button>
        </PermissionGate>,
      );

      expect(screen.getByRole("button", { name: "Create Content" }))
        .toBeInTheDocument();
    });

    it("does not render children when user lacks permission", () => {
      mockUsePermission.mockReturnValue({
        can: false,
        role: "VIEWER" as WorkspaceRole,
        isLoading: false,
      });

      render(
        <PermissionGate action="content:create">
          <button>Create Content</button>
        </PermissionGate>,
      );

      expect(screen.queryByRole("button", { name: "Create Content" })).not
        .toBeInTheDocument();
    });

    it("renders fallback when user lacks permission", () => {
      mockUsePermission.mockReturnValue({
        can: false,
        role: "VIEWER" as WorkspaceRole,
        isLoading: false,
      });

      render(
        <PermissionGate
          action="workspace:settings:write"
          fallback={<span>No access</span>}
        >
          <button>Settings</button>
        </PermissionGate>,
      );

      expect(screen.queryByRole("button", { name: "Settings" })).not
        .toBeInTheDocument();
      expect(screen.getByText("No access")).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("renders nothing by default while loading", () => {
      mockUsePermission.mockReturnValue({
        can: false,
        role: null,
        isLoading: true,
      });

      const { container } = render(
        <PermissionGate action="content:create">
          <button>Create Content</button>
        </PermissionGate>,
      );

      expect(container).toBeEmptyDOMElement();
    });

    it("renders loading skeleton when showLoading is true", () => {
      mockUsePermission.mockReturnValue({
        can: false,
        role: null,
        isLoading: true,
      });

      render(
        <PermissionGate action="content:create" showLoading>
          <button>Create Content</button>
        </PermissionGate>,
      );

      // Button should not be rendered while loading
      expect(screen.queryByRole("button", { name: "Create Content" })).not
        .toBeInTheDocument();
      // Check for loading skeleton element
      const skeleton = document.querySelector(".animate-pulse");
      expect(skeleton).toBeInTheDocument();
    });

    it("does not render fallback while loading", () => {
      mockUsePermission.mockReturnValue({
        can: false,
        role: null,
        isLoading: true,
      });

      render(
        <PermissionGate
          action="content:create"
          fallback={<span>No access</span>}
        >
          <button>Create Content</button>
        </PermissionGate>,
      );

      expect(screen.queryByText("No access")).not.toBeInTheDocument();
    });
  });

  describe("complex children", () => {
    it("renders complex JSX children when permitted", () => {
      mockUsePermission.mockReturnValue({
        can: true,
        role: "OWNER" as WorkspaceRole,
        isLoading: false,
      });

      render(
        <PermissionGate action="workspace:delete">
          <div data-testid="delete-section">
            <h2>Danger Zone</h2>
            <p>Delete this workspace permanently</p>
            <button>Delete Workspace</button>
          </div>
        </PermissionGate>,
      );

      expect(screen.getByTestId("delete-section")).toBeInTheDocument();
      expect(screen.getByText("Danger Zone")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Delete Workspace" }))
        .toBeInTheDocument();
    });

    it("renders complex fallback when not permitted", () => {
      mockUsePermission.mockReturnValue({
        can: false,
        role: "ADMIN" as WorkspaceRole,
        isLoading: false,
      });

      render(
        <PermissionGate
          action="workspace:delete"
          fallback={
            <div data-testid="upgrade-notice">
              <p>Only workspace owners can delete workspaces</p>
            </div>
          }
        >
          <button>Delete Workspace</button>
        </PermissionGate>,
      );

      expect(screen.queryByRole("button", { name: "Delete Workspace" })).not
        .toBeInTheDocument();
      expect(screen.getByTestId("upgrade-notice")).toBeInTheDocument();
      expect(screen.getByText("Only workspace owners can delete workspaces"))
        .toBeInTheDocument();
    });
  });
});

describe("withPermission HOC", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Simple test component
  function TestButton({ label }: { label: string; }) {
    return <button>{label}</button>;
  }
  TestButton.displayName = "TestButton";

  it("renders component when user has permission", () => {
    mockUsePermission.mockReturnValue({
      can: true,
      role: "ADMIN" as WorkspaceRole,
      isLoading: false,
    });

    const ProtectedButton = withPermission(TestButton, "members:invite");

    render(<ProtectedButton label="Invite Members" />);

    expect(screen.getByRole("button", { name: "Invite Members" }))
      .toBeInTheDocument();
  });

  it("does not render component when user lacks permission", () => {
    mockUsePermission.mockReturnValue({
      can: false,
      role: "MEMBER" as WorkspaceRole,
      isLoading: false,
    });

    const ProtectedButton = withPermission(TestButton, "members:invite");

    render(<ProtectedButton label="Invite Members" />);

    expect(screen.queryByRole("button", { name: "Invite Members" })).not
      .toBeInTheDocument();
  });

  it("renders fallback when user lacks permission", () => {
    mockUsePermission.mockReturnValue({
      can: false,
      role: "MEMBER" as WorkspaceRole,
      isLoading: false,
    });

    const ProtectedButton = withPermission(
      TestButton,
      "members:invite",
      <span>Admin only</span>,
    );

    render(<ProtectedButton label="Invite Members" />);

    expect(screen.queryByRole("button", { name: "Invite Members" })).not
      .toBeInTheDocument();
    expect(screen.getByText("Admin only")).toBeInTheDocument();
  });

  it("renders nothing while loading", () => {
    mockUsePermission.mockReturnValue({
      can: false,
      role: null,
      isLoading: true,
    });

    const ProtectedButton = withPermission(TestButton, "members:invite");

    const { container } = render(<ProtectedButton label="Invite Members" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("allows permission override for testing", () => {
    mockUsePermission.mockReturnValue({
      can: false,
      role: "VIEWER" as WorkspaceRole,
      isLoading: false,
    });

    const ProtectedButton = withPermission(TestButton, "workspace:delete");

    // Without override - should not render
    const { rerender } = render(<ProtectedButton label="Delete" />);
    expect(screen.queryByRole("button", { name: "Delete" })).not
      .toBeInTheDocument();

    // With override - should render despite no permission
    rerender(<ProtectedButton label="Delete" permissionOverride />);
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("sets correct display name", () => {
    const ProtectedButton = withPermission(TestButton, "content:create");

    expect(ProtectedButton.displayName).toBe("WithPermission(TestButton)");
  });

  it("handles component without displayName", () => {
    // Anonymous component
    const AnonymousComponent = ({ text }: { text: string; }) => <span>{text}</span>;

    const ProtectedAnonymous = withPermission(
      AnonymousComponent,
      "content:create",
    );

    expect(ProtectedAnonymous.displayName).toBe(
      "WithPermission(AnonymousComponent)",
    );
  });

  it("passes props correctly to wrapped component", () => {
    mockUsePermission.mockReturnValue({
      can: true,
      role: "ADMIN" as WorkspaceRole,
      isLoading: false,
    });

    function MultiPropComponent({
      title,
      count,
      active,
    }: {
      title: string;
      count: number;
      active: boolean;
    }) {
      return (
        <div data-testid="multi-prop">
          <span data-testid="title">{title}</span>
          <span data-testid="count">{count}</span>
          <span data-testid="active">{String(active)}</span>
        </div>
      );
    }

    const ProtectedMultiProp = withPermission(
      MultiPropComponent,
      "content:create",
    );

    render(<ProtectedMultiProp title="Test Title" count={42} active />);

    expect(screen.getByTestId("title")).toHaveTextContent("Test Title");
    expect(screen.getByTestId("count")).toHaveTextContent("42");
    expect(screen.getByTestId("active")).toHaveTextContent("true");
  });
});
