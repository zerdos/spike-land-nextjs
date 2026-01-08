import type { WorkspaceRole } from "@prisma/client";
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the WorkspaceContext first (before importing usePermission)
const mockUseWorkspace = vi.fn();

vi.mock("@/components/orbit/WorkspaceContext", () => ({
  useWorkspace: () => mockUseWorkspace(),
}));

// Mock the permissions module to avoid prisma imports
vi.mock("@/lib/permissions", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/permissions/permissions")
  >(
    "@/lib/permissions/permissions",
  );
  return actual;
});

// Now import after mocks are set up
import { useAllPermissions, usePermission, usePermissions } from "./usePermission";

const createMockWorkspace = (role: WorkspaceRole) => ({
  id: "ws_123",
  name: "Test Workspace",
  slug: "test-workspace",
  description: null,
  avatarUrl: null,
  isPersonal: false,
  role,
});

describe("usePermission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("usePermission", () => {
    it("returns can:false and isLoading:true while loading", () => {
      mockUseWorkspace.mockReturnValue({
        workspace: null,
        isLoading: true,
      });

      const { result } = renderHook(() => usePermission("content:create"));

      expect(result.current).toEqual({
        can: false,
        role: null,
        isLoading: true,
      });
    });

    it("returns can:false when no workspace is selected", () => {
      mockUseWorkspace.mockReturnValue({
        workspace: null,
        isLoading: false,
      });

      const { result } = renderHook(() => usePermission("content:create"));

      expect(result.current).toEqual({
        can: false,
        role: null,
        isLoading: false,
      });
    });

    it("returns can:true when user has permission", () => {
      mockUseWorkspace.mockReturnValue({
        workspace: createMockWorkspace("ADMIN"),
        isLoading: false,
      });

      const { result } = renderHook(() => usePermission("workspace:settings:write"));

      expect(result.current).toEqual({
        can: true,
        role: "ADMIN",
        isLoading: false,
      });
    });

    it("returns can:false when user lacks permission", () => {
      mockUseWorkspace.mockReturnValue({
        workspace: createMockWorkspace("MEMBER"),
        isLoading: false,
      });

      const { result } = renderHook(() => usePermission("workspace:settings:write"));

      expect(result.current).toEqual({
        can: false,
        role: "MEMBER",
        isLoading: false,
      });
    });

    it("OWNER has all permissions", () => {
      mockUseWorkspace.mockReturnValue({
        workspace: createMockWorkspace("OWNER"),
        isLoading: false,
      });

      const { result: deleteResult } = renderHook(() => usePermission("workspace:delete"));
      expect(deleteResult.current.can).toBe(true);

      const { result: viewResult } = renderHook(() => usePermission("inbox:view"));
      expect(viewResult.current.can).toBe(true);
    });

    it("VIEWER has minimal permissions", () => {
      mockUseWorkspace.mockReturnValue({
        workspace: createMockWorkspace("VIEWER"),
        isLoading: false,
      });

      // VIEWER can view inbox
      const { result: viewResult } = renderHook(() => usePermission("inbox:view"));
      expect(viewResult.current.can).toBe(true);

      // VIEWER cannot create content
      const { result: createResult } = renderHook(() => usePermission("content:create"));
      expect(createResult.current.can).toBe(false);
    });

    it("updates when workspace changes", () => {
      mockUseWorkspace.mockReturnValue({
        workspace: createMockWorkspace("VIEWER"),
        isLoading: false,
      });

      const { result, rerender } = renderHook(() => usePermission("content:create"));

      expect(result.current.can).toBe(false);
      expect(result.current.role).toBe("VIEWER");

      // Simulate workspace change
      mockUseWorkspace.mockReturnValue({
        workspace: createMockWorkspace("MEMBER"),
        isLoading: false,
      });

      rerender();

      expect(result.current.can).toBe(true);
      expect(result.current.role).toBe("MEMBER");
    });
  });

  describe("usePermissions", () => {
    it("returns all false while loading", () => {
      mockUseWorkspace.mockReturnValue({
        workspace: null,
        isLoading: true,
      });

      const { result } = renderHook(() =>
        usePermissions({
          canEdit: "content:edit:any",
          canDelete: "content:delete:any",
        })
      );

      expect(result.current).toEqual({
        canEdit: false,
        canDelete: false,
        isLoading: true,
        role: null,
      });
    });

    it("returns correct permissions for ADMIN", () => {
      mockUseWorkspace.mockReturnValue({
        workspace: createMockWorkspace("ADMIN"),
        isLoading: false,
      });

      const { result } = renderHook(() =>
        usePermissions({
          canEdit: "content:edit:any",
          canDelete: "workspace:delete",
          canInvite: "members:invite",
        })
      );

      expect(result.current).toEqual({
        canEdit: true,
        canDelete: false, // ADMIN cannot delete workspace
        canInvite: true,
        isLoading: false,
        role: "ADMIN",
      });
    });

    it("returns correct permissions for MEMBER", () => {
      mockUseWorkspace.mockReturnValue({
        workspace: createMockWorkspace("MEMBER"),
        isLoading: false,
      });

      const { result } = renderHook(() =>
        usePermissions({
          canCreate: "content:create",
          canEditAny: "content:edit:any",
          canEditOwn: "content:edit:own",
        })
      );

      expect(result.current).toEqual({
        canCreate: true,
        canEditAny: false, // MEMBER cannot edit any content
        canEditOwn: true,
        isLoading: false,
        role: "MEMBER",
      });
    });

    it("returns all false when no workspace", () => {
      mockUseWorkspace.mockReturnValue({
        workspace: null,
        isLoading: false,
      });

      const { result } = renderHook(() =>
        usePermissions({
          canView: "inbox:view",
          canRespond: "inbox:respond",
        })
      );

      expect(result.current).toEqual({
        canView: false,
        canRespond: false,
        isLoading: false,
        role: null,
      });
    });
  });

  describe("useAllPermissions", () => {
    it("returns empty actions while loading", () => {
      mockUseWorkspace.mockReturnValue({
        workspace: null,
        isLoading: true,
      });

      const { result } = renderHook(() => useAllPermissions());

      expect(result.current).toEqual({
        actions: [],
        isLoading: true,
        role: null,
      });
    });

    it("returns empty actions when no workspace", () => {
      mockUseWorkspace.mockReturnValue({
        workspace: null,
        isLoading: false,
      });

      const { result } = renderHook(() => useAllPermissions());

      expect(result.current).toEqual({
        actions: [],
        isLoading: false,
        role: null,
      });
    });

    it("returns all 29 actions for OWNER", () => {
      mockUseWorkspace.mockReturnValue({
        workspace: createMockWorkspace("OWNER"),
        isLoading: false,
      });

      const { result } = renderHook(() => useAllPermissions());

      expect(result.current.actions).toHaveLength(32);
      expect(result.current.role).toBe("OWNER");
      expect(result.current.isLoading).toBe(false);
      expect(result.current.actions).toContain("workspace:delete");
      expect(result.current.actions).toContain("workspace:transfer");
    });

    it("returns 30 actions for ADMIN (excludes OWNER-only)", () => {
      mockUseWorkspace.mockReturnValue({
        workspace: createMockWorkspace("ADMIN"),
        isLoading: false,
      });

      const { result } = renderHook(() => useAllPermissions());

      expect(result.current.actions).toHaveLength(30);
      expect(result.current.role).toBe("ADMIN");
      expect(result.current.actions).not.toContain("workspace:delete");
      expect(result.current.actions).not.toContain("workspace:transfer");
      expect(result.current.actions).toContain("workspace:settings:write");
    });

    it("returns limited actions for MEMBER", () => {
      mockUseWorkspace.mockReturnValue({
        workspace: createMockWorkspace("MEMBER"),
        isLoading: false,
      });

      const { result } = renderHook(() => useAllPermissions());

      expect(result.current.actions.length).toBeLessThan(27);
      expect(result.current.role).toBe("MEMBER");
      expect(result.current.actions).toContain("content:create");
      expect(result.current.actions).not.toContain("members:invite");
    });

    it("returns minimal actions for VIEWER", () => {
      mockUseWorkspace.mockReturnValue({
        workspace: createMockWorkspace("VIEWER"),
        isLoading: false,
      });

      const { result } = renderHook(() => useAllPermissions());

      expect(result.current.actions).toHaveLength(1);
      expect(result.current.actions).toContain("inbox:view");
      expect(result.current.role).toBe("VIEWER");
    });
  });
});
