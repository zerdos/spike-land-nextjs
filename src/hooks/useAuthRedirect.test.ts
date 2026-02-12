import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthRedirect } from "./useAuthRedirect";

const mockPush = vi.fn();
const mockPathname = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({ push: mockPush }),
}));

describe("useAuthRedirect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.mockReturnValue("/create/my-app");
  });

  it("should redirect to sign-in with current path as callbackUrl", () => {
    const { result } = renderHook(() => useAuthRedirect());
    result.current.redirectToSignIn();
    expect(mockPush).toHaveBeenCalledWith(
      "/auth/signin?callbackUrl=%2Fcreate%2Fmy-app",
    );
  });

  it("should encode the pathname correctly", () => {
    mockPathname.mockReturnValue("/create/test app/path");
    const { result } = renderHook(() => useAuthRedirect());
    result.current.redirectToSignIn();
    expect(mockPush).toHaveBeenCalledWith(
      "/auth/signin?callbackUrl=%2Fcreate%2Ftest%20app%2Fpath",
    );
  });

  it("should handle root pathname", () => {
    mockPathname.mockReturnValue("/");
    const { result } = renderHook(() => useAuthRedirect());
    result.current.redirectToSignIn();
    expect(mockPush).toHaveBeenCalledWith("/auth/signin?callbackUrl=%2F");
  });
});
