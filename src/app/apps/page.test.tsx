import { redirect } from "next/navigation";
import { describe, expect, it, vi } from "vitest";
import AppsPage from "./page";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

describe("AppsPage", () => {
  it("should redirect to /apps/pixel", () => {
    AppsPage();
    expect(redirect).toHaveBeenCalledWith("/apps/pixel");
  });
});
