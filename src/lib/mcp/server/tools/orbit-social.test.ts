import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  socialConnection: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
  onboardingStep: { findMany: vi.fn(), update: vi.fn() },
  socialPost: { create: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import type { ToolRegistry } from "../tool-registry";
import { registerOrbitSocialTools } from "./orbit-social";

function createMockRegistry(): ToolRegistry & { handlers: Map<string, (...args: unknown[]) => unknown> } {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  const registry = {
    register: vi.fn((def: { name: string; handler: (...args: unknown[]) => unknown }) => { handlers.set(def.name, def.handler); }),
    handlers,
  };
  return registry as unknown as ToolRegistry & { handlers: Map<string, (...args: unknown[]) => unknown> };
}

function getText(result: unknown): string {
  return (result as { content: Array<{ text: string }> }).content[0]!.text;
}

describe("orbit-social tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => { vi.clearAllMocks(); registry = createMockRegistry(); registerOrbitSocialTools(registry, userId); });

  it("should register 6 orbit-social tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(6);
  });

  describe("social_list_connections", () => {
    it("should list connections", async () => {
      mockPrisma.socialConnection.findMany.mockResolvedValue([
        { id: "c1", platform: "twitter", handle: "spike_land", status: "ACTIVE", connectedAt: new Date() },
      ]);
      const handler = registry.handlers.get("social_list_connections")!;
      const result = await handler({});
      expect(getText(result)).toContain("twitter");
      expect(getText(result)).toContain("spike_land");
    });

    it("should return empty message", async () => {
      mockPrisma.socialConnection.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("social_list_connections")!;
      const result = await handler({});
      expect(getText(result)).toContain("No social connections found");
    });
  });

  describe("social_connect_platform", () => {
    it("should connect platform", async () => {
      mockPrisma.socialConnection.create.mockResolvedValue({ id: "c2" });
      const handler = registry.handlers.get("social_connect_platform")!;
      const result = await handler({ platform: "instagram", handle: "spike_land" });
      expect(getText(result)).toContain("Connected");
    });
  });

  describe("social_disconnect_platform", () => {
    it("should disconnect", async () => {
      mockPrisma.socialConnection.update.mockResolvedValue({});
      const handler = registry.handlers.get("social_disconnect_platform")!;
      const result = await handler({ connection_id: "c1" });
      expect(getText(result)).toContain("Disconnected");
    });
  });

  describe("social_onboarding_status", () => {
    it("should show progress", async () => {
      mockPrisma.onboardingStep.findMany.mockResolvedValue([
        { id: "s1", name: "Connect Account", completed: true },
        { id: "s2", name: "Set Schedule", completed: false },
      ]);
      const handler = registry.handlers.get("social_onboarding_status")!;
      const result = await handler({});
      expect(getText(result)).toContain("1/2");
    });
  });

  describe("social_complete_onboarding_step", () => {
    it("should complete step", async () => {
      mockPrisma.onboardingStep.update.mockResolvedValue({});
      const handler = registry.handlers.get("social_complete_onboarding_step")!;
      const result = await handler({ step: "s2" });
      expect(getText(result)).toContain("Step Completed");
    });
  });

  describe("social_post_content", () => {
    it("should post content", async () => {
      mockPrisma.socialConnection.findUnique.mockResolvedValue({ platform: "twitter", handle: "spike_land" });
      mockPrisma.socialPost.create.mockResolvedValue({ id: "p1" });
      const handler = registry.handlers.get("social_post_content")!;
      const result = await handler({ connection_id: "c1", content: "Hello world!" });
      expect(getText(result)).toContain("Posted");
    });

    it("should return NOT_FOUND for missing connection", async () => {
      mockPrisma.socialConnection.findUnique.mockResolvedValue(null);
      const handler = registry.handlers.get("social_post_content")!;
      const result = await handler({ connection_id: "nope", content: "test" });
      expect(getText(result)).toContain("NOT_FOUND");
    });
  });
});
