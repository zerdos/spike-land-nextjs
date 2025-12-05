import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("Health Check API", () => {
  it("should return 200 status with ok message", async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ status: "ok" });
  });

  it("should return JSON response with correct content-type", async () => {
    const response = await GET();

    expect(response.headers.get("content-type")).toContain("application/json");
  });
});
