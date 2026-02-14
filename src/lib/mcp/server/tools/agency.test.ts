import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  workspace: { findFirst: vi.fn() },
  agencyPersona: { create: vi.fn() },
  agencyPortfolioItem: { findMany: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import { createMockRegistry, getText } from "../__test-utils__";
import { registerAgencyTools } from "./agency";

describe("agency tools", () => {
  const userId = "test-user-123";
  const wsId = "ws-1";
  const mockWorkspace = { id: wsId, slug: "my-ws", name: "My Workspace" };
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createMockRegistry();
    registerAgencyTools(registry, userId);
    mockPrisma.workspace.findFirst.mockResolvedValue(mockWorkspace);
  });

  it("should register 4 agency tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(4);
    expect(registry.handlers.has("agency_generate_persona")).toBe(true);
    expect(registry.handlers.has("agency_list_portfolio")).toBe(true);
    expect(registry.handlers.has("agency_verify_domain")).toBe(true);
    expect(registry.handlers.has("agency_get_theme")).toBe(true);
  });

  describe("agency_generate_persona", () => {
    it("should create a persona record", async () => {
      mockPrisma.agencyPersona.create.mockResolvedValue({ id: "persona-1" });
      const handler = registry.handlers.get("agency_generate_persona")!;
      const result = await handler({
        workspace_slug: "my-ws",
        name: "Acme Corp",
        tagline: "Innovation at scale",
        primary_hook: "Enterprise solutions for modern teams",
      });
      const text = getText(result);
      expect(text).toContain("Persona Created");
      expect(text).toContain("persona-1");
      expect(text).toContain("Acme Corp");
      expect(text).toContain("Created");
      expect(mockPrisma.agencyPersona.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          slug: "acme-corp",
          name: "Acme Corp",
          tagline: "Innovation at scale",
          primaryHook: "Enterprise solutions for modern teams",
        }),
      });
    });

    it("should generate slug from name", async () => {
      mockPrisma.agencyPersona.create.mockResolvedValue({ id: "persona-2" });
      const handler = registry.handlers.get("agency_generate_persona")!;
      await handler({
        workspace_slug: "my-ws",
        name: "Big Co Industries",
        tagline: "Building the future",
        primary_hook: "Trusted by Fortune 500",
      });
      expect(mockPrisma.agencyPersona.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ slug: "big-co-industries" }),
      });
    });
  });

  describe("agency_list_portfolio", () => {
    it("should list portfolio items", async () => {
      mockPrisma.agencyPortfolioItem.findMany.mockResolvedValue([
        { name: "Website Redesign", category: "Web", createdAt: new Date("2025-06-01") },
        { name: "Brand Identity", category: "Branding", createdAt: new Date("2025-05-15") },
      ]);
      const handler = registry.handlers.get("agency_list_portfolio")!;
      const result = await handler({ workspace_slug: "my-ws" });
      const text = getText(result);
      expect(text).toContain("Portfolio (2)");
      expect(text).toContain("Website Redesign");
      expect(text).toContain("Brand Identity");
    });

    it("should return message when no items found", async () => {
      mockPrisma.agencyPortfolioItem.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("agency_list_portfolio")!;
      const result = await handler({ workspace_slug: "my-ws" });
      expect(getText(result)).toContain("No portfolio items found");
    });
  });

  describe("agency_verify_domain", () => {
    it("should return DNS instructions for domain verification", async () => {
      const handler = registry.handlers.get("agency_verify_domain")!;
      const result = await handler({ workspace_slug: "my-ws", domain: "custom.example.com" });
      const text = getText(result);
      expect(text).toContain("Domain Verification");
      expect(text).toContain("custom.example.com");
      expect(text).toContain("CNAME");
      expect(text).toContain("cname.spike.land");
      expect(text).toContain(`spike-verify=${wsId}`);
    });
  });

  describe("agency_get_theme", () => {
    it("should return theme configuration with workspace name", async () => {
      const handler = registry.handlers.get("agency_get_theme")!;
      const result = await handler({ workspace_slug: "my-ws" });
      const text = getText(result);
      expect(text).toContain("Theme Configuration");
      expect(text).toContain("My Workspace");
      expect(text).toContain("default theme");
    });
  });
});
