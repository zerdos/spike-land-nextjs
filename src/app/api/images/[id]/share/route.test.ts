import type { EnhancedImage } from "@prisma/client";
import type { Session } from "next-auth";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    enhancedImage: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "mock-share-token"),
}));

const { auth } = await import("@/auth");
const prisma = (await import("@/lib/prisma")).default;
const { nanoid } = await import("nanoid");

describe("POST /api/images/[id]/share", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/images/img-1/share", {
      method: "POST",
    });
    const context = { params: Promise.resolve({ id: "img-1" }) };

    const response = await POST(request, context);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 if image not found", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    vi.mocked(prisma.enhancedImage.findUnique).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/images/img-1/share", {
      method: "POST",
    });
    const context = { params: Promise.resolve({ id: "img-1" }) };

    const response = await POST(request, context);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Image not found");
  });

  it("should return 403 if user does not own image", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-2", email: "other@example.com" },
    } as Session);

    const mockImage = {
      id: "img-1",
      userId: "user-1",
      shareToken: null,
    };

    vi.mocked(prisma.enhancedImage.findUnique).mockResolvedValue(
      mockImage as EnhancedImage,
    );

    const request = new NextRequest("http://localhost/api/images/img-1/share", {
      method: "POST",
    });
    const context = { params: Promise.resolve({ id: "img-1" }) };

    const response = await POST(request, context);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("should return existing shareToken if already set", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    const mockImage = {
      id: "img-1",
      userId: "user-1",
      shareToken: "existing-token",
    };

    vi.mocked(prisma.enhancedImage.findUnique).mockResolvedValue(
      mockImage as EnhancedImage,
    );

    const request = new NextRequest("http://localhost/api/images/img-1/share", {
      method: "POST",
    });
    const context = { params: Promise.resolve({ id: "img-1" }) };

    const response = await POST(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.shareToken).toBe("existing-token");
    expect(data.shareUrl).toBe("https://pixel.spike.land/share/existing-token");
    expect(prisma.enhancedImage.update).not.toHaveBeenCalled();
  });

  it("should generate new shareToken if not set", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    const mockImage = {
      id: "img-1",
      userId: "user-1",
      shareToken: null,
    };

    vi.mocked(prisma.enhancedImage.findUnique).mockResolvedValue(
      mockImage as EnhancedImage,
    );

    vi.mocked(prisma.enhancedImage.update).mockResolvedValue({
      ...mockImage,
      shareToken: "mock-share-token",
    } as EnhancedImage);

    const request = new NextRequest("http://localhost/api/images/img-1/share", {
      method: "POST",
    });
    const context = { params: Promise.resolve({ id: "img-1" }) };

    const response = await POST(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.shareToken).toBe("mock-share-token");
    expect(data.shareUrl).toBe("https://pixel.spike.land/share/mock-share-token");

    expect(nanoid).toHaveBeenCalledWith(12);
    expect(prisma.enhancedImage.update).toHaveBeenCalledWith({
      where: { id: "img-1" },
      data: { shareToken: "mock-share-token" },
    });
  });

  it("should return 500 on database error", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    vi.mocked(prisma.enhancedImage.findUnique).mockRejectedValue(
      new Error("Database connection failed"),
    );

    const request = new NextRequest("http://localhost/api/images/img-1/share", {
      method: "POST",
    });
    const context = { params: Promise.resolve({ id: "img-1" }) };

    const response = await POST(request, context);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Database connection failed");
  });

  it("should return 500 on update error", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    const mockImage = {
      id: "img-1",
      userId: "user-1",
      shareToken: null,
    };

    vi.mocked(prisma.enhancedImage.findUnique).mockResolvedValue(
      mockImage as EnhancedImage,
    );

    vi.mocked(prisma.enhancedImage.update).mockRejectedValue(
      new Error("Update failed"),
    );

    const request = new NextRequest("http://localhost/api/images/img-1/share", {
      method: "POST",
    });
    const context = { params: Promise.resolve({ id: "img-1" }) };

    const response = await POST(request, context);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Update failed");
  });
});

describe("GET /api/images/[id]/share", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/images/img-1/share");
    const context = { params: Promise.resolve({ id: "img-1" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 if image not found", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    vi.mocked(prisma.enhancedImage.findUnique).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/images/img-1/share");
    const context = { params: Promise.resolve({ id: "img-1" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Image not found");
  });

  it("should return 403 if user does not own image", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-2", email: "other@example.com" },
    } as Session);

    const mockImage = {
      id: "img-1",
      userId: "user-1",
      shareToken: null,
    };

    vi.mocked(prisma.enhancedImage.findUnique).mockResolvedValue(
      mockImage as EnhancedImage,
    );

    const request = new NextRequest("http://localhost/api/images/img-1/share");
    const context = { params: Promise.resolve({ id: "img-1" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("should return null values if shareToken not set", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    const mockImage = {
      id: "img-1",
      userId: "user-1",
      shareToken: null,
    };

    vi.mocked(prisma.enhancedImage.findUnique).mockResolvedValue(
      mockImage as EnhancedImage,
    );

    const request = new NextRequest("http://localhost/api/images/img-1/share");
    const context = { params: Promise.resolve({ id: "img-1" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.shareToken).toBeNull();
    expect(data.shareUrl).toBeNull();
  });

  it("should return shareToken and URL if set", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    const mockImage = {
      id: "img-1",
      userId: "user-1",
      shareToken: "existing-token",
    };

    vi.mocked(prisma.enhancedImage.findUnique).mockResolvedValue(
      mockImage as EnhancedImage,
    );

    const request = new NextRequest("http://localhost/api/images/img-1/share");
    const context = { params: Promise.resolve({ id: "img-1" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.shareToken).toBe("existing-token");
    expect(data.shareUrl).toBe("https://pixel.spike.land/share/existing-token");
  });

  it("should return 500 on database error", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    vi.mocked(prisma.enhancedImage.findUnique).mockRejectedValue(
      new Error("Database connection failed"),
    );

    const request = new NextRequest("http://localhost/api/images/img-1/share");
    const context = { params: Promise.resolve({ id: "img-1" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Database connection failed");
  });
});
