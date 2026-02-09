import { POST } from "./route";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// Mock dependencies
vi.mock("@/auth");
vi.mock("@/lib/prisma", () => ({
  default: {
    workspace: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}));

describe("POST /api/workspaces", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user session exists but user is not in database", async () => {
    // Mock authenticated session
    vi.mocked(auth).mockResolvedValue({
      user: { id: "non-existent-user-id" },
    } as any);

    // Mock ensureUniqueSlug (it uses prisma.workspace.findUnique)
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue(null);

    // Mock user lookup to return null (user not found)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    // Create request
    const request = new Request("http://localhost/api/workspaces", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Workspace",
      }),
    });

    // Call the handler
    const response = await POST(request);

    // Assertions
    // Assertions
    expect(response.status).toBe(401); 
    const data = await response.json();
    expect(data.error).toBe("User not found");
  });
});
