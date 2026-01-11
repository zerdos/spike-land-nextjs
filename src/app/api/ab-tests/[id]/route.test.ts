import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, PUT } from "./route";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    abTest: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe("A/B Tests [id] API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("should return a single A/B test", async () => {
      const session = { user: { id: "1" } };
      const test = { id: "1", name: "Test 1", variants: [] };
      vi.mocked(auth).mockResolvedValue(
        session as ReturnType<typeof auth> extends Promise<infer T> ? T : never,
      );
      vi.mocked(prisma.abTest.findUnique).mockResolvedValue(
        test as unknown as Awaited<ReturnType<typeof prisma.abTest.findUnique>>,
      );

      const req = new NextRequest("http://localhost/api/ab-tests/1");
      const res = await GET(req, { params: Promise.resolve({ id: "1" }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.test).toEqual(test);
    });
  });

  describe("PUT", () => {
    it("should update an A/B test", async () => {
      const session = { user: { id: "1" } };
      const updatedTest = { id: "1", name: "Updated Test" };
      vi.mocked(auth).mockResolvedValue(
        session as ReturnType<typeof auth> extends Promise<infer T> ? T : never,
      );
      vi.mocked(prisma.abTest.update).mockResolvedValue(
        updatedTest as Awaited<ReturnType<typeof prisma.abTest.update>>,
      );

      const req = new NextRequest("http://localhost/api/ab-tests/1", {
        method: "PUT",
        body: JSON.stringify({ name: "Updated Test" }),
      });
      const res = await PUT(req, { params: Promise.resolve({ id: "1" }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.test).toEqual(updatedTest);
    });
  });

  describe("DELETE", () => {
    it("should delete an A/B test", async () => {
      const session = { user: { id: "1" } };
      vi.mocked(auth).mockResolvedValue(
        session as ReturnType<typeof auth> extends Promise<infer T> ? T : never,
      );
      vi.mocked(prisma.abTest.delete).mockResolvedValue(
        {} as Awaited<ReturnType<typeof prisma.abTest.delete>>,
      );

      const req = new NextRequest("http://localhost/api/ab-tests/1", {
        method: "DELETE",
      });
      const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });

      expect(res.status).toBe(204);
    });
  });
});
