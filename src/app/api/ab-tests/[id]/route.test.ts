import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT, DELETE } from "./route";
import { NextRequest } from "next/server";

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
      require("@/auth").auth.mockResolvedValue(session);
      require("@/lib/prisma").default.abTest.findUnique.mockResolvedValue(test);

      const req = new NextRequest("http://localhost/api/ab-tests/1");
      const res = await GET(req, { params: { id: "1" } });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.test).toEqual(test);
    });
  });

  describe("PUT", () => {
    it("should update an A/B test", async () => {
      const session = { user: { id: "1" } };
      const updatedTest = { id: "1", name: "Updated Test" };
      require("@/auth").auth.mockResolvedValue(session);
      require("@/lib/prisma").default.abTest.update.mockResolvedValue(updatedTest);

      const req = new NextRequest("http://localhost/api/ab-tests/1", {
        method: "PUT",
        body: JSON.stringify({ name: "Updated Test" }),
      });
      const res = await PUT(req, { params: { id: "1" } });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.test).toEqual(updatedTest);
    });
  });

  describe("DELETE", () => {
    it("should delete an A/B test", async () => {
      const session = { user: { id: "1" } };
      require("@/auth").auth.mockResolvedValue(session);
      require("@/lib/prisma").default.abTest.delete.mockResolvedValue({});

      const req = new NextRequest("http://localhost/api/ab-tests/1", {
        method: "DELETE",
      });
      const res = await DELETE(req, { params: { id: "1" } });

      expect(res.status).toBe(204);
    });
  });
});
