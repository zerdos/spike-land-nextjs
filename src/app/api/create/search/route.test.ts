import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock prisma
const mockFindMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  default: {
    createdApp: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

vi.mock("@prisma/client", () => ({
  CreatedAppStatus: {
    PUBLISHED: "PUBLISHED",
  },
}));

import { GET } from "./route";

function createRequest(url: string): Request {
  return new Request(url);
}

describe("GET /api/create/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindMany.mockResolvedValue([]);
  });

  it("returns empty array for missing query", async () => {
    const request = createRequest("http://localhost/api/create/search");
    const response = await GET(request);
    const data = await response.json();

    expect(data).toEqual([]);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("returns empty array for query shorter than 2 chars", async () => {
    const request = createRequest("http://localhost/api/create/search?q=a");
    const response = await GET(request);
    const data = await response.json();

    expect(data).toEqual([]);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("returns 400 for query longer than 200 chars", async () => {
    const longQuery = "a".repeat(201);
    const request = createRequest(
      `http://localhost/api/create/search?q=${longQuery}`,
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "Query too long" });
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("calls prisma with correct where clause", async () => {
    mockFindMany.mockResolvedValue([]);

    const request = createRequest(
      "http://localhost/api/create/search?q=todo",
    );
    await GET(request);

    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        status: "PUBLISHED",
        OR: [
          { title: { contains: "todo", mode: "insensitive" } },
          { description: { contains: "todo", mode: "insensitive" } },
          { slug: { contains: "todo", mode: "insensitive" } },
        ],
      },
      select: {
        slug: true,
        title: true,
        description: true,
      },
      orderBy: { viewCount: "desc" },
      take: 8,
    });
  });

  it("returns search results as JSON", async () => {
    const mockResults = [
      { slug: "todo-list", title: "Todo List", description: "A simple todo" },
      {
        slug: "todo-advanced",
        title: "Advanced Todo",
        description: "Full featured",
      },
    ];
    mockFindMany.mockResolvedValue(mockResults);

    const request = createRequest(
      "http://localhost/api/create/search?q=todo",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockResults);
  });

  it("limits results to 8", async () => {
    const request = createRequest(
      "http://localhost/api/create/search?q=test",
    );
    await GET(request);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 8,
      }),
    );
  });

  it("orders by viewCount desc", async () => {
    const request = createRequest(
      "http://localhost/api/create/search?q=test",
    );
    await GET(request);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { viewCount: "desc" },
      }),
    );
  });

  it("searches title, description, and slug", async () => {
    const request = createRequest(
      "http://localhost/api/create/search?q=widget",
    );
    await GET(request);

    const callArgs = mockFindMany.mock.calls[0]![0];
    const orConditions = callArgs.where.OR;

    expect(orConditions).toHaveLength(3);

    const fields = orConditions.map(
      (condition: Record<string, unknown>) => Object.keys(condition)[0],
    );
    expect(fields).toContain("title");
    expect(fields).toContain("description");
    expect(fields).toContain("slug");

    // Each should use case-insensitive contains
    for (const condition of orConditions) {
      const field = Object.keys(condition)[0]!;
      expect(condition[field]).toEqual({
        contains: "widget",
        mode: "insensitive",
      });
    }
  });
});
