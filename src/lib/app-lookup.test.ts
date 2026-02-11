import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Use vi.hoisted to define mocks that will be available when vi.mock is hoisted
const { mockApp, mockGetOrCreateSession } = vi.hoisted(() => ({
  mockApp: {
    findFirst: vi.fn(),
  },
  mockGetOrCreateSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    app: mockApp,
  },
}));

vi.mock("@/lib/codespace", () => ({
  getOrCreateSession: mockGetOrCreateSession,
}));

import {
  appIncludeOptions,
  checkCodespaceHasContent,
  findAppByIdentifier,
  findAppByIdentifierSimple,
} from "./app-lookup";

// Mock app factory
const createMockApp = (overrides: Record<string, unknown> = {}) => ({
  id: "cm7x9abc123def456ghi789j",
  name: "Test App",
  codespaceId: "test-codespace",
  slug: "test-slug",
  userId: "user-123",
  status: "DRAFT",
  description: null,
  forkedFrom: null,
  domain: null,
  codespaceUrl: null,
  isCurated: false,
  isPublic: false,
  lastAgentActivity: null,
  createdAt: new Date("2024-01-15"),
  updatedAt: new Date("2024-01-15"),
  ...overrides,
});

describe("app-lookup", () => {
  const testUserId = "user-123";
  const testCodespaceId = "test-codespace";
  const testSlug = "test-slug";
  const testCuid = "cm7x9abc123def456ghi789j";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("appIncludeOptions", () => {
    it("should export correct include configuration", () => {
      expect(appIncludeOptions).toEqual({
        requirements: {
          orderBy: { createdAt: "asc" },
        },
        monetizationModels: {
          orderBy: { createdAt: "asc" },
        },
        statusHistory: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            status: true,
            message: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            messages: true,
            images: true,
          },
        },
      });
    });
  });

  describe("findAppByIdentifier", () => {
    it("should find app by codespaceId (primary path)", async () => {
      const mockAppData = createMockApp();
      mockApp.findFirst.mockResolvedValueOnce(mockAppData);

      const result = await findAppByIdentifier(testCodespaceId, testUserId);

      expect(result).toEqual(mockAppData);
      expect(mockApp.findFirst).toHaveBeenCalledTimes(1);
      expect(mockApp.findFirst).toHaveBeenCalledWith({
        where: {
          codespaceId: testCodespaceId,
          userId: testUserId,
          deletedAt: null,
          status: { not: "ARCHIVED" },
        },
        include: appIncludeOptions,
      });
    });

    it("should fallback to slug when codespaceId not found", async () => {
      const mockAppData = createMockApp();
      mockApp.findFirst
        .mockResolvedValueOnce(null) // codespaceId lookup fails
        .mockResolvedValueOnce(mockAppData); // slug lookup succeeds

      const result = await findAppByIdentifier(testSlug, testUserId);

      expect(result).toEqual(mockAppData);
      expect(mockApp.findFirst).toHaveBeenCalledTimes(2);
      expect(mockApp.findFirst).toHaveBeenNthCalledWith(2, {
        where: {
          slug: testSlug,
          userId: testUserId,
          deletedAt: null,
          status: { not: "ARCHIVED" },
        },
        include: appIncludeOptions,
      });
    });

    it("should fallback to cuid when codespaceId and slug not found", async () => {
      const mockAppData = createMockApp({ id: testCuid });
      mockApp.findFirst
        .mockResolvedValueOnce(null) // codespaceId lookup fails
        .mockResolvedValueOnce(null) // slug lookup fails
        .mockResolvedValueOnce(mockAppData); // id lookup succeeds

      const result = await findAppByIdentifier(testCuid, testUserId);

      expect(result).toEqual(mockAppData);
      expect(mockApp.findFirst).toHaveBeenCalledTimes(3);
      expect(mockApp.findFirst).toHaveBeenNthCalledWith(3, {
        where: {
          id: testCuid,
          userId: testUserId,
          deletedAt: null,
          status: { not: "ARCHIVED" },
        },
        include: appIncludeOptions,
      });
    });

    it("should return null when app not found in any path", async () => {
      mockApp.findFirst.mockResolvedValue(null);

      const result = await findAppByIdentifier(testCuid, testUserId);

      expect(result).toBeNull();
      expect(mockApp.findFirst).toHaveBeenCalledTimes(3);
    });

    it("should skip cuid lookup for non-cuid identifiers", async () => {
      mockApp.findFirst.mockResolvedValue(null);

      const result = await findAppByIdentifier("not-a-cuid", testUserId);

      expect(result).toBeNull();
      // Only codespaceId and slug lookups, no id lookup
      expect(mockApp.findFirst).toHaveBeenCalledTimes(2);
    });

    it("should exclude archived apps from results", async () => {
      mockApp.findFirst.mockResolvedValue(null);

      await findAppByIdentifier(testCodespaceId, testUserId);

      // Verify all calls include the archived filter
      expect(mockApp.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { not: "ARCHIVED" },
          }),
        }),
      );
    });

    it("should filter by userId for security", async () => {
      const differentUserId = "other-user-456";
      mockApp.findFirst.mockResolvedValue(null);

      await findAppByIdentifier(testCodespaceId, differentUserId);

      expect(mockApp.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: differentUserId,
          }),
        }),
      );
    });
  });

  describe("findAppByIdentifierSimple", () => {
    it("should find app by codespaceId without includes", async () => {
      const mockAppData = createMockApp();
      mockApp.findFirst.mockResolvedValueOnce(mockAppData);

      const result = await findAppByIdentifierSimple(
        testCodespaceId,
        testUserId,
      );

      expect(result).toEqual(mockAppData);
      expect(mockApp.findFirst).toHaveBeenCalledTimes(1);
      expect(mockApp.findFirst).toHaveBeenCalledWith({
        where: {
          codespaceId: testCodespaceId,
          userId: testUserId,
          deletedAt: null,
          status: { not: "ARCHIVED" },
        },
      });
      // Verify no include option was passed
      expect(mockApp.findFirst).not.toHaveBeenCalledWith(
        expect.objectContaining({ include: expect.anything() }),
      );
    });

    it("should fallback to slug when codespaceId not found", async () => {
      const mockAppData = createMockApp();
      mockApp.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockAppData);

      const result = await findAppByIdentifierSimple(testSlug, testUserId);

      expect(result).toEqual(mockAppData);
      expect(mockApp.findFirst).toHaveBeenCalledTimes(2);
    });

    it("should fallback to cuid when other lookups fail", async () => {
      const mockAppData = createMockApp({ id: testCuid });
      mockApp.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockAppData);

      const result = await findAppByIdentifierSimple(testCuid, testUserId);

      expect(result).toEqual(mockAppData);
      expect(mockApp.findFirst).toHaveBeenCalledTimes(3);
    });

    it("should skip cuid lookup for non-cuid identifiers", async () => {
      mockApp.findFirst.mockResolvedValue(null);

      const result = await findAppByIdentifierSimple("simple-slug", testUserId);

      expect(result).toBeNull();
      expect(mockApp.findFirst).toHaveBeenCalledTimes(2);
    });
  });

  describe("checkCodespaceHasContent", () => {
    beforeEach(() => {
      mockGetOrCreateSession.mockReset();
    });

    it("should return true when codespace has non-default content", async () => {
      mockGetOrCreateSession.mockResolvedValueOnce({
        html: "<div>My custom app content</div>",
        code: "",
        transpiled: "",
        css: "",
      });

      const result = await checkCodespaceHasContent("my-codespace");

      expect(result).toBe(true);
      expect(mockGetOrCreateSession).toHaveBeenCalledWith("my-codespace");
    });

    it("should return false when codespace has default content", async () => {
      mockGetOrCreateSession.mockResolvedValueOnce({
        html: "<div>Write your code here!</div>",
        code: "",
        transpiled: "",
        css: "",
      });

      const result = await checkCodespaceHasContent("empty-codespace");

      expect(result).toBe(false);
    });

    it("should return false when codespace has default content with whitespace", async () => {
      mockGetOrCreateSession.mockResolvedValueOnce({
        html: "  <div>Write your code here!</div>  \n",
        code: "",
        transpiled: "",
        css: "",
      });

      const result = await checkCodespaceHasContent("whitespace-codespace");

      expect(result).toBe(false);
    });

    it("should return false when session lookup fails", async () => {
      mockGetOrCreateSession.mockRejectedValueOnce(new Error("Not found"));

      const result = await checkCodespaceHasContent("nonexistent-codespace");

      expect(result).toBe(false);
    });

    it("should return false when getOrCreateSession throws an error", async () => {
      mockGetOrCreateSession.mockRejectedValueOnce(new Error("Network error"));

      const result = await checkCodespaceHasContent("error-codespace");

      expect(result).toBe(false);
    });

    it("should encode special characters in codespace name", async () => {
      mockGetOrCreateSession.mockResolvedValueOnce({
        html: "<div>Content</div>",
        code: "",
        transpiled: "",
        css: "",
      });

      await checkCodespaceHasContent("my codespace/test");

      expect(mockGetOrCreateSession).toHaveBeenCalledWith("my codespace/test");
    });
  });
});
