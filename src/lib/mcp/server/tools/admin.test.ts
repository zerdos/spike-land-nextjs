import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    aIProvider: { findMany: vi.fn(), update: vi.fn() },
    emailLog: { findMany: vi.fn(), create: vi.fn() },
    featuredGalleryItem: { findMany: vi.fn(), update: vi.fn(), delete: vi.fn() },
    mcpGenerationJob: { findMany: vi.fn(), update: vi.fn(), delete: vi.fn() },
    enhancedImage: { findMany: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import type { ToolRegistry } from "../tool-registry";
import { registerAdminTools } from "./admin";

function createMockRegistry(): ToolRegistry & { handlers: Map<string, (...args: unknown[]) => unknown> } {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  const registry = {
    register: vi.fn((def: { name: string; handler: (...args: unknown[]) => unknown }) => {
      handlers.set(def.name, def.handler);
    }),
    handlers,
  };
  return registry as unknown as ToolRegistry & { handlers: Map<string, (...args: unknown[]) => unknown> };
}

function getText(result: unknown): string {
  return (result as { content: Array<{ text: string }> }).content[0]!.text;
}

describe("admin tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createMockRegistry();
    registerAdminTools(registry, userId);
  });

  it("should register 10 admin tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(10);
    expect(registry.handlers.has("admin_list_agents")).toBe(true);
    expect(registry.handlers.has("admin_manage_agent")).toBe(true);
    expect(registry.handlers.has("admin_list_emails")).toBe(true);
    expect(registry.handlers.has("admin_send_email")).toBe(true);
    expect(registry.handlers.has("admin_list_gallery")).toBe(true);
    expect(registry.handlers.has("admin_manage_gallery")).toBe(true);
    expect(registry.handlers.has("admin_list_jobs")).toBe(true);
    expect(registry.handlers.has("admin_manage_job")).toBe(true);
    expect(registry.handlers.has("admin_list_photos")).toBe(true);
    expect(registry.handlers.has("admin_moderate_photo")).toBe(true);
  });

  describe("admin_list_agents", () => {
    it("should list agents", async () => {
      mockPrisma.aIProvider.findMany.mockResolvedValue([
        { id: "a1", name: "GPT-4", isDefault: true, createdAt: new Date() },
      ]);
      const handler = registry.handlers.get("admin_list_agents")!;
      const result = await handler({});
      expect(getText(result)).toContain("GPT-4");
      expect(getText(result)).toContain("DEFAULT");
    });

    it("should return message when no agents found", async () => {
      mockPrisma.aIProvider.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("admin_list_agents")!;
      const result = await handler({});
      expect(getText(result)).toContain("No agents found");
    });
  });

  describe("admin_manage_agent", () => {
    it("should activate an agent", async () => {
      mockPrisma.aIProvider.update.mockResolvedValue({});
      const handler = registry.handlers.get("admin_manage_agent")!;
      const result = await handler({ agent_id: "a1", action: "activate" });
      expect(getText(result)).toContain("activate completed");
      expect(mockPrisma.aIProvider.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isDefault: true } }),
      );
    });

    it("should deactivate an agent", async () => {
      mockPrisma.aIProvider.update.mockResolvedValue({});
      const handler = registry.handlers.get("admin_manage_agent")!;
      await handler({ agent_id: "a1", action: "deactivate" });
      expect(mockPrisma.aIProvider.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isDefault: false } }),
      );
    });
  });

  describe("admin_list_emails", () => {
    it("should list emails", async () => {
      mockPrisma.emailLog.findMany.mockResolvedValue([
        { id: "e1", to: "test@test.com", subject: "Welcome", status: "SENT", sentAt: new Date() },
      ]);
      const handler = registry.handlers.get("admin_list_emails")!;
      const result = await handler({});
      expect(getText(result)).toContain("Welcome");
      expect(getText(result)).toContain("SENT");
    });
  });

  describe("admin_send_email", () => {
    it("should queue an email", async () => {
      mockPrisma.emailLog.create.mockResolvedValue({ id: "e2" });
      const handler = registry.handlers.get("admin_send_email")!;
      const result = await handler({ to: "test@test.com", subject: "Hi", template: "welcome" });
      expect(getText(result)).toContain("Email queued");
    });
  });

  describe("admin_list_gallery", () => {
    it("should list gallery items", async () => {
      mockPrisma.featuredGalleryItem.findMany.mockResolvedValue([
        { id: "g1", title: "Sunset", enhancedUrl: "https://example.com/sunset.jpg", isActive: true, createdAt: new Date() },
      ]);
      const handler = registry.handlers.get("admin_list_gallery")!;
      const result = await handler({});
      expect(getText(result)).toContain("Sunset");
      expect(getText(result)).toContain("ACTIVE");
    });
  });

  describe("admin_manage_gallery", () => {
    it("should remove a gallery item", async () => {
      mockPrisma.featuredGalleryItem.delete.mockResolvedValue({});
      const handler = registry.handlers.get("admin_manage_gallery")!;
      const result = await handler({ item_id: "g1", action: "remove" });
      expect(getText(result)).toContain("removed");
    });

    it("should feature a gallery item", async () => {
      mockPrisma.featuredGalleryItem.update.mockResolvedValue({});
      const handler = registry.handlers.get("admin_manage_gallery")!;
      const result = await handler({ item_id: "g1", action: "feature" });
      expect(getText(result)).toContain("feature completed");
    });
  });

  describe("admin_list_jobs", () => {
    it("should list jobs", async () => {
      mockPrisma.mcpGenerationJob.findMany.mockResolvedValue([
        { id: "j1", type: "GENERATE", status: "COMPLETED", prompt: "A cat", createdAt: new Date() },
      ]);
      const handler = registry.handlers.get("admin_list_jobs")!;
      const result = await handler({});
      expect(getText(result)).toContain("GENERATE");
      expect(getText(result)).toContain("COMPLETED");
    });
  });

  describe("admin_manage_job", () => {
    it("should cancel a job", async () => {
      mockPrisma.mcpGenerationJob.update.mockResolvedValue({});
      const handler = registry.handlers.get("admin_manage_job")!;
      const result = await handler({ job_id: "j1", action: "cancel" });
      expect(getText(result)).toContain("cancel completed");
    });

    it("should delete a job", async () => {
      mockPrisma.mcpGenerationJob.delete.mockResolvedValue({});
      const handler = registry.handlers.get("admin_manage_job")!;
      const result = await handler({ job_id: "j1", action: "delete" });
      expect(getText(result)).toContain("deleted");
    });
  });

  describe("admin_list_photos", () => {
    it("should list photos", async () => {
      mockPrisma.enhancedImage.findMany.mockResolvedValue([
        { id: "p1", name: "Beach", originalUrl: "https://example.com/beach.jpg", isPublic: true, createdAt: new Date() },
      ]);
      const handler = registry.handlers.get("admin_list_photos")!;
      const result = await handler({});
      expect(getText(result)).toContain("Beach");
      expect(getText(result)).toContain("PUBLIC");
    });
  });

  describe("admin_moderate_photo", () => {
    it("should approve a photo", async () => {
      mockPrisma.enhancedImage.update.mockResolvedValue({});
      const handler = registry.handlers.get("admin_moderate_photo")!;
      const result = await handler({ photo_id: "p1", action: "approve" });
      expect(getText(result)).toContain("approved");
    });

    it("should reject a photo", async () => {
      mockPrisma.enhancedImage.update.mockResolvedValue({});
      const handler = registry.handlers.get("admin_moderate_photo")!;
      const result = await handler({ photo_id: "p1", action: "reject" });
      expect(getText(result)).toContain("rejected");
    });
  });
});
