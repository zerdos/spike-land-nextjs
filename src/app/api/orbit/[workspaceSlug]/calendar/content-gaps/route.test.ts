/**
 * Content Gap Detection API Tests
 *
 * Unit tests for the content gap detection API route.
 * Resolves #869
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies before importing the route
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    workspace: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/calendar/content-gaps", () => ({
  detectContentGaps: vi.fn(),
}));

import { auth } from "@/auth";
import { type ContentGapsResponse, detectContentGaps } from "@/lib/calendar/content-gaps";
import prisma from "@/lib/prisma";
import { GET } from "./route";

describe("GET /api/orbit/[workspaceSlug]/calendar/content-gaps", () => {
  const mockWorkspaceSlug = "test-workspace";
  const mockWorkspaceId = "workspace-123";
  const mockUserId = "user-123";

  function createRequest(searchParams: Record<string, string> = {}): NextRequest {
    const url = new URL(
      `http://localhost/api/orbit/${mockWorkspaceSlug}/calendar/content-gaps`,
    );
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }
    return new NextRequest(url);
  }

  function createParams(): Promise<{ workspaceSlug: string; }> {
    return Promise.resolve({ workspaceSlug: mockWorkspaceSlug });
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("authentication", () => {
    it("returns 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const response = await GET(createRequest(), { params: createParams() });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 401 when session has no user id", async () => {
      vi.mocked(auth).mockResolvedValue({ user: {} } as never);

      const response = await GET(createRequest(), { params: createParams() });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("workspace access", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId },
      } as never);
    });

    it("returns 404 when workspace not found", async () => {
      vi.mocked(prisma.workspace.findFirst).mockResolvedValue(null);

      const response = await GET(createRequest(), { params: createParams() });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Workspace not found or access denied");
    });

    it("returns 404 when user not a member", async () => {
      // findFirst returns null if user is not a member due to where clause
      vi.mocked(prisma.workspace.findFirst).mockResolvedValue(null);

      const response = await GET(createRequest(), { params: createParams() });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Workspace not found or access denied");
    });
  });

  describe("parameter validation", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId },
      } as never);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValue({
        id: mockWorkspaceId,
      } as never);
    });

    it("returns 400 for invalid days parameter (non-numeric)", async () => {
      const response = await GET(createRequest({ days: "abc" }), {
        params: createParams(),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("days must be a number");
    });

    it("returns 400 for days less than 1", async () => {
      const response = await GET(createRequest({ days: "0" }), {
        params: createParams(),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("days must be a number between 1 and 30");
    });

    it("returns 400 for days greater than 30", async () => {
      const response = await GET(createRequest({ days: "31" }), {
        params: createParams(),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("days must be a number between 1 and 30");
    });

    it("returns 400 for invalid platform", async () => {
      const response = await GET(createRequest({ platform: "INVALID" }), {
        params: createParams(),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid platform");
    });

    it("accepts valid platform parameter (case insensitive)", async () => {
      vi.mocked(detectContentGaps).mockResolvedValue({ gaps: [] });

      const response = await GET(createRequest({ platform: "linkedin" }), {
        params: createParams(),
      });

      expect(response.status).toBe(200);
      expect(detectContentGaps).toHaveBeenCalledWith(
        expect.objectContaining({
          platform: "LINKEDIN",
        }),
      );
    });

    it("accepts valid days parameter", async () => {
      vi.mocked(detectContentGaps).mockResolvedValue({ gaps: [] });

      const response = await GET(createRequest({ days: "14" }), {
        params: createParams(),
      });

      expect(response.status).toBe(200);
      expect(detectContentGaps).toHaveBeenCalledWith(
        expect.objectContaining({
          daysAhead: 14,
        }),
      );
    });

    it("accepts timezone parameter", async () => {
      vi.mocked(detectContentGaps).mockResolvedValue({ gaps: [] });

      const response = await GET(createRequest({ timezone: "America/New_York" }), {
        params: createParams(),
      });

      expect(response.status).toBe(200);
      expect(detectContentGaps).toHaveBeenCalledWith(
        expect.objectContaining({
          timezone: "America/New_York",
        }),
      );
    });
  });

  describe("successful responses", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId },
      } as never);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValue({
        id: mockWorkspaceId,
      } as never);
    });

    it("returns gaps from detectContentGaps", async () => {
      const mockGaps: ContentGapsResponse = {
        gaps: [
          {
            date: "2024-01-16",
            timeSlot: "morning" as const,
            platform: "LINKEDIN",
            severity: "high" as const,
            suggestedTime: "2024-01-16T09:00:00Z",
            reason: "High engagement period with no content",
          },
        ],
      };
      vi.mocked(detectContentGaps).mockResolvedValue(mockGaps);

      const response = await GET(createRequest(), { params: createParams() });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.gaps).toHaveLength(1);
      expect(data.gaps[0].date).toBe("2024-01-16");
      expect(data.gaps[0].severity).toBe("high");
    });

    it("uses default values when no parameters provided", async () => {
      vi.mocked(detectContentGaps).mockResolvedValue({ gaps: [] });

      await GET(createRequest(), { params: createParams() });

      expect(detectContentGaps).toHaveBeenCalledWith({
        workspaceId: mockWorkspaceId,
        daysAhead: 7,
        platform: undefined,
        timezone: "UTC",
      });
    });

    it("returns empty array when no gaps found", async () => {
      vi.mocked(detectContentGaps).mockResolvedValue({ gaps: [] });

      const response = await GET(createRequest(), { params: createParams() });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.gaps).toHaveLength(0);
    });
  });

  describe("error handling", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId },
      } as never);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValue({
        id: mockWorkspaceId,
      } as never);
    });

    it("returns 500 when detectContentGaps throws", async () => {
      vi.mocked(detectContentGaps).mockRejectedValue(new Error("Database error"));

      const response = await GET(createRequest(), { params: createParams() });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to analyze content gaps");
    });

    it("returns 404 when workspace lookup throws", async () => {
      vi.mocked(prisma.workspace.findFirst).mockRejectedValue(
        new Error("Database error"),
      );

      const response = await GET(createRequest(), { params: createParams() });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Workspace not found or access denied");
    });
  });
});
