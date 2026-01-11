import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWorkspaceMembers } from "./useWorkspaceMembers";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode; }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useWorkspaceMembers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches members successfully", async () => {
    const mockMembers = [
      { id: "1", name: "Alice", avatarUrl: null, role: "ADMIN" },
      { id: "2", name: "Bob", avatarUrl: "http://example.com/bob.jpg", role: "USER" },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMembers,
    });

    const { result } = renderHook(() => useWorkspaceMembers("test-workspace"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockMembers);
    expect(mockFetch).toHaveBeenCalledWith("/api/orbit/test-workspace/members");
  });

  it("handles error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useWorkspaceMembers("test-workspace"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
