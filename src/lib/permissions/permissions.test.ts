import type { WorkspaceRole } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  canApproveContent,
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
          "client:dashboard:view",
          "client:content:view",
          "client:content:comment",
          "client:approval:view",
          "client:approval:approve",
          "client:approval:reject",
          "client:activity:view",
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
        expect(hasPermission("ADMIN", "client:approval:approve")).toBe(true);

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
        expect(hasPermission("MEMBER", "client:content:view")).toBe(true);

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
        expect(hasPermission("VIEWER", "client:dashboard:view")).toBe(true);

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

    describe("CLIENT role", () => {
      it("has highly restricted permissions", () => {
        // CLIENT can do
        expect(hasPermission("CLIENT", "client:dashboard:view")).toBe(true);
        expect(hasPermission("CLIENT", "client:content:view")).toBe(true);
        expect(hasPermission("CLIENT", "client:content:comment")).toBe(true);
        expect(hasPermission("CLIENT", "client:approval:view")).toBe(true);
        expect(hasPermission("CLIENT", "client:approval:approve")).toBe(true);
        expect(hasPermission("CLIENT", "client:approval:reject")).toBe(true);
        expect(hasPermission("CLIENT", "client:activity:view")).toBe(true);

        // CLIENT cannot do
        expect(hasPermission("CLIENT", "inbox:view")).toBe(false); // VIEWER+
        expect(hasPermission("CLIENT", "workspace:delete")).toBe(false);
        expect(hasPermission("CLIENT", "workspace:settings:read")).toBe(false);
        expect(hasPermission("CLIENT", "members:list")).toBe(false); // MEMBER+
        expect(hasPermission("CLIENT", "content:create")).toBe(false);
        expect(hasPermission("CLIENT", "analytics:view")).toBe(false);
      });
    });
  });

  describe("getPermittedActions", () => {
    it("returns all actions for OWNER", () => {
      const actions = getPermittedActions("OWNER");
      expect(actions).toHaveLength(47); // 40 + 7 new client actions
      expect(actions).toContain("workspace:delete");
      expect(actions).toContain("client:approval:approve");
    });

    it("returns correct actions for CLIENT", () => {
      const actions = getPermittedActions("CLIENT");
      expect(actions).toHaveLength(7);
      expect(actions).toContain("client:dashboard:view");
      expect(actions).not.toContain("inbox:view");
    });

    it("returns correct actions for VIEWER", () => {
      const actions = getPermittedActions("VIEWER");
      // VIEWER actions + CLIENT actions (since VIEWER > CLIENT)
      expect(actions.length).toBeGreaterThan(7);
      expect(actions).toContain("inbox:view");
      expect(actions).toContain("client:dashboard:view");
    });
  });

  describe("getRequiredRole", () => {
    it("returns CLIENT for client actions", () => {
      expect(getRequiredRole("client:dashboard:view")).toBe("CLIENT");
      expect(getRequiredRole("client:approval:approve")).toBe("CLIENT");
    });

    it("returns VIEWER for viewer actions", () => {
      expect(getRequiredRole("inbox:view")).toBe("VIEWER");
    });
  });

  describe("getAllActions", () => {
    it("returns all 47 defined actions", () => {
      const actions = getAllActions();
      expect(actions).toHaveLength(47);
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

      it("can change CLIENT to VIEWER", () => {
        expect(canModifyRole("OWNER", "CLIENT", "VIEWER")).toBe(true);
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

      it("can change CLIENT to VIEWER", () => {
        expect(canModifyRole("ADMIN", "CLIENT", "VIEWER")).toBe(true);
      });

      it("can change VIEWER to CLIENT", () => {
        expect(canModifyRole("ADMIN", "VIEWER", "CLIENT")).toBe(true);
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
      expect(compareRoles("VIEWER", "CLIENT")).toBeGreaterThan(0);
      expect(compareRoles("MEMBER", "CLIENT")).toBeGreaterThan(0);
    });

    it("returns negative when first role is lower", () => {
      expect(compareRoles("ADMIN", "OWNER")).toBeLessThan(0);
      expect(compareRoles("MEMBER", "ADMIN")).toBeLessThan(0);
      expect(compareRoles("VIEWER", "MEMBER")).toBeLessThan(0);
      expect(compareRoles("CLIENT", "VIEWER")).toBeLessThan(0);
    });

    it("returns 0 when roles are equal", () => {
      const roles: WorkspaceRole[] = [
        "OWNER",
        "ADMIN",
        "MEMBER",
        "VIEWER",
        "CLIENT",
      ];
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
      expect(isAtLeast("VIEWER", "CLIENT")).toBe(true);

      expect(isAtLeast("CLIENT", "CLIENT")).toBe(true);
    });

    it("returns false when role is below minimum", () => {
      expect(isAtLeast("ADMIN", "OWNER")).toBe(false);
      expect(isAtLeast("MEMBER", "OWNER")).toBe(false);
      expect(isAtLeast("MEMBER", "ADMIN")).toBe(false);
      expect(isAtLeast("VIEWER", "OWNER")).toBe(false);
      expect(isAtLeast("VIEWER", "ADMIN")).toBe(false);
      expect(isAtLeast("VIEWER", "MEMBER")).toBe(false);
      expect(isAtLeast("CLIENT", "VIEWER")).toBe(false);
    });
  });

  describe("canApproveContent", () => {
    const approvers = ["user1", "user2"];

    it("returns true if user is CLIENT and in approvers list", () => {
      expect(canApproveContent("CLIENT", "user1", approvers)).toBe(true);
    });

    it("returns false if user is CLIENT but not in approvers list", () => {
      expect(canApproveContent("CLIENT", "user3", approvers)).toBe(false);
    });

    it("returns true if user is MEMBER and in approvers list", () => {
      // MEMBER inherits CLIENT permissions
      expect(canApproveContent("MEMBER", "user1", approvers)).toBe(true);
    });
  });
});
