import { redirect } from "next/navigation";
import { describe, expect, it, vi } from "vitest";
import AlbumsPage from "./page";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

describe("AlbumsPage", () => {
  it("redirects to /pixel", () => {
    AlbumsPage();

    expect(redirect).toHaveBeenCalledWith("/pixel");
  });
});
