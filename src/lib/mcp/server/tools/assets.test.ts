import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  workspace: { findFirst: vi.fn() },
  asset: { create: vi.fn(), findMany: vi.fn(), updateMany: vi.fn(), findFirst: vi.fn() },
  assetTag: { upsert: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import { createMockRegistry, getText } from "../__test-utils__";
import { registerAssetsTools } from "./assets";

describe("assets tools", () => {
  const userId = "test-user-123";
  const wsId = "ws-1";
  const mockWorkspace = { id: wsId, slug: "my-ws", name: "My Workspace" };
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createMockRegistry();
    registerAssetsTools(registry, userId);
    mockPrisma.workspace.findFirst.mockResolvedValue(mockWorkspace);
  });

  it("should register 5 assets tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(5);
    expect(registry.handlers.has("asset_upload")).toBe(true);
    expect(registry.handlers.has("asset_list")).toBe(true);
    expect(registry.handlers.has("asset_search")).toBe(true);
    expect(registry.handlers.has("asset_organize")).toBe(true);
    expect(registry.handlers.has("asset_tag")).toBe(true);
  });

  describe("asset_upload", () => {
    it("should create an asset record", async () => {
      mockPrisma.asset.create.mockResolvedValue({ id: "asset-1" });
      const handler = registry.handlers.get("asset_upload")!;
      const result = await handler({
        workspace_slug: "my-ws",
        name: "logo.png",
        url: "https://cdn.example.com/logo.png",
        mime_type: "image/png",
      });
      const text = getText(result);
      expect(text).toContain("Asset Uploaded");
      expect(text).toContain("asset-1");
      expect(text).toContain("logo.png");
      expect(mockPrisma.asset.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "logo.png",
          url: "https://cdn.example.com/logo.png",
          mimeType: "image/png",
          workspaceId: wsId,
          uploadedById: userId,
        }),
      });
    });

    it("should include folder_id when provided", async () => {
      mockPrisma.asset.create.mockResolvedValue({ id: "asset-2" });
      const handler = registry.handlers.get("asset_upload")!;
      await handler({
        workspace_slug: "my-ws",
        name: "photo.jpg",
        url: "https://cdn.example.com/photo.jpg",
        mime_type: "image/jpeg",
        folder_id: "folder-1",
      });
      expect(mockPrisma.asset.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ folderId: "folder-1" }),
      });
    });
  });

  describe("asset_list", () => {
    it("should list assets with tags", async () => {
      mockPrisma.asset.findMany.mockResolvedValue([
        { id: "a1", name: "logo.png", mimeType: "image/png", createdAt: new Date("2025-06-01"), tags: [{ tag: "brand" }] },
        { id: "a2", name: "banner.jpg", mimeType: "image/jpeg", createdAt: new Date("2025-06-02"), tags: [] },
      ]);
      const handler = registry.handlers.get("asset_list")!;
      const result = await handler({ workspace_slug: "my-ws" });
      const text = getText(result);
      expect(text).toContain("Assets (2)");
      expect(text).toContain("logo.png");
      expect(text).toContain("brand");
      expect(text).toContain("banner.jpg");
    });

    it("should return message when no assets found", async () => {
      mockPrisma.asset.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("asset_list")!;
      const result = await handler({ workspace_slug: "my-ws" });
      expect(getText(result)).toContain("No assets found");
    });

    it("should apply folder and mime_type filters", async () => {
      mockPrisma.asset.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("asset_list")!;
      await handler({ workspace_slug: "my-ws", folder_id: "f1", mime_type: "image/" });
      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            folderId: "f1",
            mimeType: { startsWith: "image/" },
          }),
        }),
      );
    });
  });

  describe("asset_search", () => {
    it("should search assets by name or tag", async () => {
      mockPrisma.asset.findMany.mockResolvedValue([
        { id: "a1", name: "brand-logo.png", mimeType: "image/png", tags: [{ tag: "brand" }] },
      ]);
      const handler = registry.handlers.get("asset_search")!;
      const result = await handler({ workspace_slug: "my-ws", query: "brand" });
      const text = getText(result);
      expect(text).toContain("Search Results");
      expect(text).toContain("brand-logo.png");
    });

    it("should return message when no results", async () => {
      mockPrisma.asset.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("asset_search")!;
      const result = await handler({ workspace_slug: "my-ws", query: "nonexistent" });
      expect(getText(result)).toContain("No assets found");
    });
  });

  describe("asset_organize", () => {
    it("should move assets to a folder", async () => {
      mockPrisma.asset.updateMany.mockResolvedValue({ count: 3 });
      const handler = registry.handlers.get("asset_organize")!;
      const result = await handler({
        workspace_slug: "my-ws",
        asset_ids: ["a1", "a2", "a3"],
        folder_id: "folder-1",
      });
      const text = getText(result);
      expect(text).toContain("Assets Organized");
      expect(text).toContain("3");
      expect(mockPrisma.asset.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["a1", "a2", "a3"] } },
        data: { folderId: "folder-1" },
      });
    });
  });

  describe("asset_tag", () => {
    it("should add tags and return final tag list", async () => {
      mockPrisma.asset.findFirst
        .mockResolvedValueOnce({ id: "a1", name: "logo.png", tags: [{ tag: "old" }] })
        .mockResolvedValueOnce({ id: "a1", name: "logo.png", tags: [{ tag: "old" }, { tag: "brand" }, { tag: "new" }] });
      mockPrisma.assetTag.upsert.mockResolvedValue({});
      const handler = registry.handlers.get("asset_tag")!;
      const result = await handler({
        workspace_slug: "my-ws",
        asset_id: "a1",
        tags: ["brand", "new"],
      });
      const text = getText(result);
      expect(text).toContain("Tags Updated");
      expect(text).toContain("old, brand, new");
      expect(mockPrisma.assetTag.upsert).toHaveBeenCalledTimes(2);
    });

    it("should return NOT_FOUND for missing asset", async () => {
      mockPrisma.asset.findFirst.mockResolvedValue(null);
      const handler = registry.handlers.get("asset_tag")!;
      const result = await handler({
        workspace_slug: "my-ws",
        asset_id: "missing",
        tags: ["tag1"],
      });
      expect(getText(result)).toContain("NOT_FOUND");
    });
  });
});
