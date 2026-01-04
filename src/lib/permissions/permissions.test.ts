import type { WorkspaceRole } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  canModifyRole,
  compareRoles,
  getAllActions,
  getPermittedActions,
  getRequiredRole,
  hasPermission,
  isAtLeast,
  type WorkspaceAction,
} from "./permissions";

describe("permissions", () => {
  describe("hasPermission", () => {
    describe("OWNER role", () => {
      it("has all permissions", () => {
        const ownerActions: WorkspaceAction[] = [
          "workspace:delete",
          "workspace:transfer",
          "workspace:settings:read",
          "workspace:settings:write",
          "members:invite",
          "members:remove",
          "members:role:change",
          "members:list",
          "content:create",
          "content:edit:own",
          "content:edit:any",
          "content:delete:own",
          "content:delete:any",
          "content:publish",
          "streams:create",
          "streams:manage",
          "calendar:create",
          "calendar:manage",
          "agents:create",
          "agents:configure",
          "agents:use",
          "analytics:view",
          "analytics:export",
          "inbox:view",
          "inbox:respond",
          "inbox:manage",
        ];

        for (const action of ownerActions) {
          expect(hasPermission("OWNER", action)).toBe(true);
        }
      });
    });

    describe("ADMIN role", () => {
      it("has most permissions except OWNER-only actions", () => {
        // ADMIN can do
        expect(hasPermission("ADMIN", "workspace:settings:read")).toBe(true);
        expect(hasPermission("ADMIN", "workspace:settings:write")).toBe(true);
        expect(hasPermission("ADMIN", "members:invite")).toBe(true);
        expect(hasPermission("ADMIN", "members:remove")).toBe(true);
        expect(hasPermission("ADMIN", "members:role:change")).toBe(true);
        expect(hasPermission("ADMIN", "content:edit:any")).toBe(true);
        expect(hasPermission("ADMIN", "content:delete:any")).toBe(true);
        expect(hasPermission("ADMIN", "streams:manage")).toBe(true);
        expect(hasPermission("ADMIN", "agents:create")).toBe(true);
        expect(hasPermission("ADMIN", "analytics:export")).toBe(true);
        expect(hasPermission("ADMIN", "inbox:manage")).toBe(true);

        // ADMIN cannot do
        expect(hasPermission("ADMIN", "workspace:delete")).toBe(false);
        expect(hasPermission("ADMIN", "workspace:transfer")).toBe(false);
      });
    });

    describe("MEMBER role", () => {
      it("has content creation and basic viewing permissions", () => {
        // MEMBER can do
        expect(hasPermission("MEMBER", "members:list")).toBe(true);
        expect(hasPermission("MEMBER", "content:create")).toBe(true);
        expect(hasPermission("MEMBER", "content:edit:own")).toBe(true);
        expect(hasPermission("MEMBER", "content:delete:own")).toBe(true);
        expect(hasPermission("MEMBER", "content:publish")).toBe(true);
        expect(hasPermission("MEMBER", "streams:create")).toBe(true);
        expect(hasPermission("MEMBER", "calendar:create")).toBe(true);
        expect(hasPermission("MEMBER", "agents:use")).toBe(true);
        expect(hasPermission("MEMBER", "analytics:view")).toBe(true);
        expect(hasPermission("MEMBER", "inbox:view")).toBe(true);
        expect(hasPermission("MEMBER", "inbox:respond")).toBe(true);

        // MEMBER cannot do
        expect(hasPermission("MEMBER", "workspace:delete")).toBe(false);
        expect(hasPermission("MEMBER", "workspace:transfer")).toBe(false);
        expect(hasPermission("MEMBER", "workspace:settings:read")).toBe(false);
        expect(hasPermission("MEMBER", "workspace:settings:write")).toBe(false);
        expect(hasPermission("MEMBER", "members:invite")).toBe(false);
        expect(hasPermission("MEMBER", "members:remove")).toBe(false);
        expect(hasPermission("MEMBER", "members:role:change")).toBe(false);
        expect(hasPermission("MEMBER", "content:edit:any")).toBe(false);
        expect(hasPermission("MEMBER", "content:delete:any")).toBe(false);
        expect(hasPermission("MEMBER", "streams:manage")).toBe(false);
        expect(hasPermission("MEMBER", "calendar:manage")).toBe(false);
        expect(hasPermission("MEMBER", "agents:create")).toBe(false);
        expect(hasPermission("MEMBER", "agents:configure")).toBe(false);
        expect(hasPermission("MEMBER", "analytics:export")).toBe(false);
        expect(hasPermission("MEMBER", "inbox:manage")).toBe(false);
      });
    });

    describe("VIEWER role", () => {
      it("has minimal read-only permissions", () => {
        // VIEWER can only view inbox
        expect(hasPermission("VIEWER", "inbox:view")).toBe(true);

        // VIEWER cannot do anything else
        expect(hasPermission("VIEWER", "workspace:delete")).toBe(false);
        expect(hasPermission("VIEWER", "workspace:transfer")).toBe(false);
        expect(hasPermission("VIEWER", "workspace:settings:read")).toBe(false);
        expect(hasPermission("VIEWER", "members:list")).toBe(false);
        expect(hasPermission("VIEWER", "content:create")).toBe(false);
        expect(hasPermission("VIEWER", "content:edit:own")).toBe(false);
        expect(hasPermission("VIEWER", "streams:create")).toBe(false);
        expect(hasPermission("VIEWER", "agents:use")).toBe(false);
        expect(hasPermission("VIEWER", "analytics:view")).toBe(false);
        expect(hasPermission("VIEWER", "inbox:respond")).toBe(false);
      });
    });
  });

  describe("getPermittedActions", () => {
    it("returns all actions for OWNER", () => {
      const actions = getPermittedActions("OWNER");
      expect(actions).toHaveLength(26);
      expect(actions).toContain("workspace:delete");
      expect(actions).toContain("workspace:transfer");
    });

    it("returns correct actions for ADMIN", () => {
      const actions = getPermittedActions("ADMIN");
      expect(actions).not.toContain("workspace:delete");
      expect(actions).not.toContain("workspace:transfer");
      expect(actions).toContain("workspace:settings:read");
      expect(actions).toContain("members:invite");
    });

    it("returns correct actions for MEMBER", () => {
      const actions = getPermittedActions("MEMBER");
      expect(actions).toContain("content:create");
      expect(actions).toContain("inbox:view");
      expect(actions).not.toContain("members:invite");
      expect(actions).not.toContain("workspace:settings:read");
    });

    it("returns minimal actions for VIEWER", () => {
      const actions = getPermittedActions("VIEWER");
      expect(actions).toHaveLength(1);
      expect(actions).toContain("inbox:view");
    });
  });

  describe("getRequiredRole", () => {
    it("returns OWNER for owner-only actions", () => {
      expect(getRequiredRole("workspace:delete")).toBe("OWNER");
      expect(getRequiredRole("workspace:transfer")).toBe("OWNER");
    });

    it("returns ADMIN for admin actions", () => {
      expect(getRequiredRole("workspace:settings:read")).toBe("ADMIN");
      expect(getRequiredRole("members:invite")).toBe("ADMIN");
      expect(getRequiredRole("content:edit:any")).toBe("ADMIN");
    });

    it("returns MEMBER for member actions", () => {
      expect(getRequiredRole("content:create")).toBe("MEMBER");
      expect(getRequiredRole("members:list")).toBe("MEMBER");
      expect(getRequiredRole("inbox:respond")).toBe("MEMBER");
    });

    it("returns VIEWER for viewer actions", () => {
      expect(getRequiredRole("inbox:view")).toBe("VIEWER");
    });
  });

  describe("getAllActions", () => {
    it("returns all 26 defined actions", () => {
      const actions = getAllActions();
      expect(actions).toHaveLength(26);
    });

    it("includes actions from all categories", () => {
      const actions = getAllActions();
      expect(actions).toContain("workspace:delete");
      expect(actions).toContain("members:invite");
      expect(actions).toContain("content:create");
      expect(actions).toContain("streams:create");
      expect(actions).toContain("agents:use");
      expect(actions).toContain("analytics:view");
      expect(actions).toContain("inbox:view");
    });
  });

  describe("canModifyRole", () => {
    describe("OWNER actor", () => {
      it("can promote MEMBER to ADMIN", () => {
        expect(canModifyRole("OWNER", "MEMBER", "ADMIN")).toBe(true);
      });

      it("can promote MEMBER to OWNER (transfer)", () => {
        expect(canModifyRole("OWNER", "MEMBER", "OWNER")).toBe(true);
      });

      it("can promote ADMIN to OWNER (transfer)", () => {
        expect(canModifyRole("OWNER", "ADMIN", "OWNER")).toBe(true);
      });

      it("can demote ADMIN to MEMBER", () => {
        expect(canModifyRole("OWNER", "ADMIN", "MEMBER")).toBe(true);
      });

      it("can demote ADMIN to VIEWER", () => {
        expect(canModifyRole("OWNER", "ADMIN", "VIEWER")).toBe(true);
      });

      it("can change VIEWER to MEMBER", () => {
        expect(canModifyRole("OWNER", "VIEWER", "MEMBER")).toBe(true);
      });

      it("cannot change role to the same role", () => {
        expect(canModifyRole("OWNER", "MEMBER", "MEMBER")).toBe(false);
      });
    });

    describe("ADMIN actor", () => {
      it("can change MEMBER to VIEWER", () => {
        expect(canModifyRole("ADMIN", "MEMBER", "VIEWER")).toBe(true);
      });

      it("can change VIEWER to MEMBER", () => {
        expect(canModifyRole("ADMIN", "VIEWER", "MEMBER")).toBe(true);
      });

      it("cannot promote MEMBER to ADMIN", () => {
        expect(canModifyRole("ADMIN", "MEMBER", "ADMIN")).toBe(false);
      });

      it("cannot promote MEMBER to OWNER", () => {
        expect(canModifyRole("ADMIN", "MEMBER", "OWNER")).toBe(false);
      });

      it("cannot modify OWNER role", () => {
        expect(canModifyRole("ADMIN", "OWNER", "ADMIN")).toBe(false);
        expect(canModifyRole("ADMIN", "OWNER", "MEMBER")).toBe(false);
      });

      it("cannot modify other ADMIN roles", () => {
        expect(canModifyRole("ADMIN", "ADMIN", "MEMBER")).toBe(false);
        expect(canModifyRole("ADMIN", "ADMIN", "VIEWER")).toBe(false);
      });

      it("cannot change role to the same role", () => {
        expect(canModifyRole("ADMIN", "VIEWER", "VIEWER")).toBe(false);
      });
    });

    describe("MEMBER actor", () => {
      it("cannot modify any roles", () => {
        expect(canModifyRole("MEMBER", "VIEWER", "MEMBER")).toBe(false);
        expect(canModifyRole("MEMBER", "MEMBER", "VIEWER")).toBe(false);
      });
    });

    describe("VIEWER actor", () => {
      it("cannot modify any roles", () => {
        expect(canModifyRole("VIEWER", "VIEWER", "MEMBER")).toBe(false);
        expect(canModifyRole("VIEWER", "MEMBER", "VIEWER")).toBe(false);
      });
    });
  });

  describe("compareRoles", () => {
    it("returns positive when first role is higher", () => {
      expect(compareRoles("OWNER", "ADMIN")).toBeGreaterThan(0);
      expect(compareRoles("ADMIN", "MEMBER")).toBeGreaterThan(0);
      expect(compareRoles("MEMBER", "VIEWER")).toBeGreaterThan(0);
    });

    it("returns negative when first role is lower", () => {
      expect(compareRoles("ADMIN", "OWNER")).toBeLessThan(0);
      expect(compareRoles("MEMBER", "ADMIN")).toBeLessThan(0);
      expect(compareRoles("VIEWER", "MEMBER")).toBeLessThan(0);
    });

    it("returns 0 when roles are equal", () => {
      const roles: WorkspaceRole[] = ["OWNER", "ADMIN", "MEMBER", "VIEWER"];
      for (const role of roles) {
        expect(compareRoles(role, role)).toBe(0);
      }
    });
  });

  describe("isAtLeast", () => {
    it("returns true when role meets minimum", () => {
      expect(isAtLeast("OWNER", "OWNER")).toBe(true);
      expect(isAtLeast("OWNER", "ADMIN")).toBe(true);
      expect(isAtLeast("OWNER", "MEMBER")).toBe(true);
      expect(isAtLeast("OWNER", "VIEWER")).toBe(true);

      expect(isAtLeast("ADMIN", "ADMIN")).toBe(true);
      expect(isAtLeast("ADMIN", "MEMBER")).toBe(true);
      expect(isAtLeast("ADMIN", "VIEWER")).toBe(true);

      expect(isAtLeast("MEMBER", "MEMBER")).toBe(true);
      expect(isAtLeast("MEMBER", "VIEWER")).toBe(true);

      expect(isAtLeast("VIEWER", "VIEWER")).toBe(true);
    });

    it("returns false when role is below minimum", () => {
      expect(isAtLeast("ADMIN", "OWNER")).toBe(false);
      expect(isAtLeast("MEMBER", "OWNER")).toBe(false);
      expect(isAtLeast("MEMBER", "ADMIN")).toBe(false);
      expect(isAtLeast("VIEWER", "OWNER")).toBe(false);
      expect(isAtLeast("VIEWER", "ADMIN")).toBe(false);
      expect(isAtLeast("VIEWER", "MEMBER")).toBe(false);
    });
  });
});
