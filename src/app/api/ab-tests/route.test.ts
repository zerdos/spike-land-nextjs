import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";

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
      vi.mocked(auth).mockResolvedValue(
        session as ReturnType<typeof auth> extends Promise<infer T> ? T : never,
      );
      vi.mocked(prisma.abTest.findMany).mockResolvedValue(
        tests as unknown as Awaited<ReturnType<typeof prisma.abTest.findMany>>,
      );

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
      vi.mocked(auth).mockResolvedValue(
        session as ReturnType<typeof auth> extends Promise<infer T> ? T : never,
      );
      vi.mocked(prisma.abTest.create).mockResolvedValue(
        createdTest as unknown as Awaited<
          ReturnType<typeof prisma.abTest.create>
        >,
      );

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
