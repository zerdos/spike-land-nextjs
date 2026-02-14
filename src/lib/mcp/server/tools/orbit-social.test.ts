import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  socialAccount: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
  socialPost: { create: vi.fn() },
  socialPostAccount: { create: vi.fn() },
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
      mockPrisma.socialAccount.findMany.mockResolvedValue([
        { id: "c1", platform: "twitter", accountName: "spike_land", status: "ACTIVE", connectedAt: new Date() },
      ]);
      const handler = registry.handlers.get("social_list_connections")!;
      const result = await handler({});
      expect(getText(result)).toContain("twitter");
      expect(getText(result)).toContain("spike_land");
    });

    it("should return empty message", async () => {
      mockPrisma.socialAccount.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("social_list_connections")!;
      const result = await handler({});
      expect(getText(result)).toContain("No social connections found");
    });
  });

  describe("social_connect_platform", () => {
    it("should connect platform", async () => {
      mockPrisma.socialAccount.create.mockResolvedValue({ id: "c2" });
      const handler = registry.handlers.get("social_connect_platform")!;
      const result = await handler({ platform: "instagram", handle: "spike_land" });
      expect(getText(result)).toContain("Connected");
    });
  });

  describe("social_disconnect_platform", () => {
    it("should disconnect", async () => {
      mockPrisma.socialAccount.update.mockResolvedValue({});
      const handler = registry.handlers.get("social_disconnect_platform")!;
      const result = await handler({ connection_id: "c1" });
      expect(getText(result)).toContain("Disconnected");
    });
  });

  describe("social_onboarding_status", () => {
    it("should return TODO stub", async () => {
      const handler = registry.handlers.get("social_onboarding_status")!;
      const result = await handler({});
      expect(getText(result)).toContain("OnboardingStep model not yet added to schema");
    });
  });

  describe("social_complete_onboarding_step", () => {
    it("should return TODO stub", async () => {
      const handler = registry.handlers.get("social_complete_onboarding_step")!;
      const result = await handler({ step: "s2" });
      expect(getText(result)).toContain("OnboardingStep model not yet added to schema");
    });
  });

  describe("social_post_content", () => {
    it("should post content", async () => {
      mockPrisma.socialAccount.findUnique.mockResolvedValue({ id: "c1", platform: "twitter", accountName: "spike_land" });
      mockPrisma.socialPost.create.mockResolvedValue({ id: "p1" });
      mockPrisma.socialPostAccount.create.mockResolvedValue({ id: "spa1" });
      const handler = registry.handlers.get("social_post_content")!;
      const result = await handler({ connection_id: "c1", content: "Hello world!" });
      expect(getText(result)).toContain("Posted");
    });

    it("should return NOT_FOUND for missing connection", async () => {
      mockPrisma.socialAccount.findUnique.mockResolvedValue(null);
      const handler = registry.handlers.get("social_post_content")!;
      const result = await handler({ connection_id: "nope", content: "test" });
      expect(getText(result)).toContain("NOT_FOUND");
    });
  });
});
