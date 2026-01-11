import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";
import { NextRequest } from "next/server";
import { headers } from "next/headers";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    abTest: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe("A/B Tests API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("should return a list of A/B tests", async () => {
      const session = { user: { id: "1" } };
      const tests = [{ id: "1", name: "Test 1", variants: [] }];
      require("@/auth").auth.mockResolvedValue(session);
      require("@/lib/prisma").default.abTest.findMany.mockResolvedValue(tests);

      const req = new NextRequest("http://localhost/api/ab-tests");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.tests).toEqual(tests);
    });
  });

  describe("POST", () => {
    it("should create a new A/B test", async () => {
      const session = { user: { id: "1" } };
      const newTest = {
        name: "New Test",
        description: "A new test",
        variants: [
          { name: "Control", splitPercentage: 50 },
          { name: "Variant A", splitPercentage: 50 },
        ],
      };
      const createdTest = { id: "2", ...newTest };
      require("@/auth").auth.mockResolvedValue(session);
      require("@/lib/prisma").default.abTest.create.mockResolvedValue(createdTest);

      const req = new NextRequest("http://localhost/api/ab-tests", {
        method: "POST",
        body: JSON.stringify(newTest),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.test).toEqual(createdTest);
    });
  });
});
