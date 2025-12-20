/**
 * Tests for Admin Storage API Route
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/auth/admin-middleware", () => ({
  requireAdminByUserId: vi.fn(),
}));
vi.mock("@/lib/storage/r2-client", () => ({
  isR2Configured: vi.fn(),
  listR2StorageStats: vi.fn(),
}));

const { auth } = await import("@/auth");
const { requireAdminByUserId } = await import("@/lib/auth/admin-middleware");
const { isR2Configured, listR2StorageStats } = await import(
  "@/lib/storage/r2-client"
);

describe("Admin Storage API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should return 500 if auth throws an error", async () => {
    vi.mocked(auth).mockRejectedValue(new Error("Auth service unavailable"));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
    expect(console.error).toHaveBeenCalledWith(
      "Failed to fetch storage stats:",
      expect.any(Error),
    );
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 401 if session has no user id", async () => {
    vi.mocked(auth).mockResolvedValue({ user: {} } as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 if user is not admin", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_123" },
    } as any);
    vi.mocked(requireAdminByUserId).mockRejectedValue(
      new Error("Forbidden: Admin access required"),
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden: Admin access required");
  });

  it("should return 500 if admin check fails with non-Forbidden error", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_123" },
    } as any);
    vi.mocked(requireAdminByUserId).mockRejectedValue(
      new Error("Database connection failed"),
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
    expect(console.error).toHaveBeenCalledWith(
      "Admin check failed:",
      expect.any(Error),
    );
  });

  it("should return unconfigured state when R2 is not configured", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin_123" },
    } as any);
    vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
    vi.mocked(isR2Configured).mockReturnValue(false);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.isConfigured).toBe(false);
    expect(data.totalFiles).toBe(0);
    expect(data.totalSizeBytes).toBe(0);
    expect(data.totalSizeFormatted).toBe("0 B");
    expect(data.averageSizeBytes).toBe(0);
    expect(data.averageSizeFormatted).toBe("0 B");
    expect(data.imageStats).toEqual({
      count: 0,
      sizeBytes: 0,
      sizeFormatted: "0 B",
    });
    expect(data.byFileType).toEqual({});
  });

  it("should return storage stats when R2 is configured", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin_123" },
    } as any);
    vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
    vi.mocked(isR2Configured).mockReturnValue(true);
    vi.mocked(listR2StorageStats).mockResolvedValue({
      success: true,
      stats: {
        totalFiles: 150,
        totalSizeBytes: 1073741824, // 1 GB
        averageSizeBytes: 7158279,
        byFileType: {
          png: { count: 50, sizeBytes: 536870912 },
          jpg: { count: 80, sizeBytes: 429496730 },
          pdf: { count: 20, sizeBytes: 107374182 },
        },
      },
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.isConfigured).toBe(true);
    expect(data.totalFiles).toBe(150);
    expect(data.totalSizeBytes).toBe(1073741824);
    expect(data.totalSizeFormatted).toBe("1 GB");
    expect(data.averageSizeBytes).toBe(7158279);
    expect(data.averageSizeFormatted).toBe("6.83 MB");
    // Image stats should combine png and jpg
    expect(data.imageStats.count).toBe(130);
    expect(data.imageStats.sizeBytes).toBe(966367642);
    expect(data.byFileType.png.count).toBe(50);
    expect(data.byFileType.png.sizeFormatted).toBe("512 MB");
    expect(data.byFileType.jpg.count).toBe(80);
    expect(data.byFileType.pdf.count).toBe(20);
  });

  it("should return 500 if listR2StorageStats fails", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin_123" },
    } as any);
    vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
    vi.mocked(isR2Configured).mockReturnValue(true);
    vi.mocked(listR2StorageStats).mockResolvedValue({
      success: false,
      stats: null,
      error: "Connection failed",
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Connection failed");
  });

  it("should return 500 if listR2StorageStats returns no stats", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin_123" },
    } as any);
    vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
    vi.mocked(isR2Configured).mockReturnValue(true);
    vi.mocked(listR2StorageStats).mockResolvedValue({
      success: true,
      stats: null,
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch storage stats");
  });

  it("should handle empty storage", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin_123" },
    } as any);
    vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
    vi.mocked(isR2Configured).mockReturnValue(true);
    vi.mocked(listR2StorageStats).mockResolvedValue({
      success: true,
      stats: {
        totalFiles: 0,
        totalSizeBytes: 0,
        averageSizeBytes: 0,
        byFileType: {},
      },
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.isConfigured).toBe(true);
    expect(data.totalFiles).toBe(0);
    expect(data.totalSizeFormatted).toBe("0 B");
    expect(data.imageStats.count).toBe(0);
    expect(data.byFileType).toEqual({});
  });

  it("should handle unexpected errors", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin_123" },
    } as any);
    vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
    vi.mocked(isR2Configured).mockReturnValue(true);
    vi.mocked(listR2StorageStats).mockRejectedValue(
      new Error("Unexpected error"),
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
    expect(console.error).toHaveBeenCalledWith(
      "Failed to fetch storage stats:",
      expect.any(Error),
    );
  });

  it("should correctly categorize all image extensions", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin_123" },
    } as any);
    vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
    vi.mocked(isR2Configured).mockReturnValue(true);
    vi.mocked(listR2StorageStats).mockResolvedValue({
      success: true,
      stats: {
        totalFiles: 70,
        totalSizeBytes: 1000000,
        averageSizeBytes: 14286,
        byFileType: {
          jpg: { count: 10, sizeBytes: 100000 },
          jpeg: { count: 10, sizeBytes: 100000 },
          png: { count: 10, sizeBytes: 100000 },
          gif: { count: 10, sizeBytes: 100000 },
          webp: { count: 10, sizeBytes: 100000 },
          avif: { count: 10, sizeBytes: 100000 },
          svg: { count: 10, sizeBytes: 100000 },
        },
      },
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.imageStats.count).toBe(70);
    expect(data.imageStats.sizeBytes).toBe(700000);
  });

  it("should format various byte sizes correctly", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin_123" },
    } as any);
    vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
    vi.mocked(isR2Configured).mockReturnValue(true);
    vi.mocked(listR2StorageStats).mockResolvedValue({
      success: true,
      stats: {
        totalFiles: 4,
        totalSizeBytes: 1099511627776, // 1 TB
        averageSizeBytes: 274877906944, // ~256 GB
        byFileType: {
          bin: { count: 1, sizeBytes: 512 }, // 512 B
          txt: { count: 1, sizeBytes: 1536 }, // 1.5 KB
          mp4: { count: 1, sizeBytes: 1572864 }, // 1.5 MB
          iso: { count: 1, sizeBytes: 1610612736 }, // 1.5 GB
        },
      },
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.totalSizeFormatted).toBe("1 TB");
    expect(data.averageSizeFormatted).toBe("256 GB");
    expect(data.byFileType.bin.sizeFormatted).toBe("512 B");
    expect(data.byFileType.txt.sizeFormatted).toBe("1.5 KB");
    expect(data.byFileType.mp4.sizeFormatted).toBe("1.5 MB");
    expect(data.byFileType.iso.sizeFormatted).toBe("1.5 GB");
  });
});
