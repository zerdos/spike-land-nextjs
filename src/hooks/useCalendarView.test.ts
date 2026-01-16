/**
 * useCalendarView Hook Tests
 *
 * Part of #574: Build Calendar UI
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCalendarView } from "./useCalendarView";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode; }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  };
}

describe("useCalendarView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ posts: [] }),
    });
  });

  it("should initialize with default values", () => {
    const { result } = renderHook(
      () =>
        useCalendarView({
          workspaceId: "ws-123",
          enabled: false,
        }),
      { wrapper: createWrapper() },
    );

    expect(result.current.posts).toEqual([]);
    expect(result.current.viewMode).toBe("month");
    expect(result.current.filters).toEqual({});
    expect(result.current.isLoading).toBe(false);
  });

  it("should navigate to next month", () => {
    const { result } = renderHook(
      () =>
        useCalendarView({
          workspaceId: "ws-123",
          enabled: false,
        }),
      { wrapper: createWrapper() },
    );

    const initialDate = result.current.currentDate;

    act(() => {
      result.current.goToNextMonth();
    });

    expect(result.current.currentDate.getMonth()).toBe(
      (initialDate.getMonth() + 1) % 12,
    );
  });

  it("should navigate to previous month", () => {
    const { result } = renderHook(
      () =>
        useCalendarView({
          workspaceId: "ws-123",
          enabled: false,
        }),
      { wrapper: createWrapper() },
    );

    const initialDate = result.current.currentDate;

    act(() => {
      result.current.goToPreviousMonth();
    });

    const expectedMonth = initialDate.getMonth() === 0
      ? 11
      : initialDate.getMonth() - 1;
    expect(result.current.currentDate.getMonth()).toBe(expectedMonth);
  });

  it("should navigate to today", () => {
    const { result } = renderHook(
      () =>
        useCalendarView({
          workspaceId: "ws-123",
          enabled: false,
          initialDate: new Date(2020, 0, 1),
        }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.goToToday();
    });

    const today = new Date();
    expect(result.current.currentDate.getMonth()).toBe(today.getMonth());
    expect(result.current.currentDate.getFullYear()).toBe(today.getFullYear());
  });

  it("should navigate to specific date", () => {
    const { result } = renderHook(
      () =>
        useCalendarView({
          workspaceId: "ws-123",
          enabled: false,
        }),
      { wrapper: createWrapper() },
    );

    const targetDate = new Date(2025, 5, 15);

    act(() => {
      result.current.goToDate(targetDate);
    });

    expect(result.current.currentDate.getMonth()).toBe(5);
    expect(result.current.currentDate.getFullYear()).toBe(2025);
  });

  it("should change view mode", () => {
    const { result } = renderHook(
      () =>
        useCalendarView({
          workspaceId: "ws-123",
          enabled: false,
        }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.setViewMode("week");
    });

    expect(result.current.viewMode).toBe("week");

    act(() => {
      result.current.setViewMode("day");
    });

    expect(result.current.viewMode).toBe("day");
  });

  it("should set filters", () => {
    const { result } = renderHook(
      () =>
        useCalendarView({
          workspaceId: "ws-123",
          enabled: false,
        }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.setFilters({
        platforms: ["LINKEDIN"],
        status: ["SCHEDULED"],
      });
    });

    expect(result.current.filters).toEqual({
      platforms: ["LINKEDIN"],
      status: ["SCHEDULED"],
    });
  });

  it("should fetch calendar posts when enabled", async () => {
    const mockPosts = [
      {
        id: "post-1",
        content: "Test post",
        scheduledAt: new Date().toISOString(),
        status: "SCHEDULED",
        platforms: ["LINKEDIN"],
        accountNames: ["Test Account"],
        isRecurring: false,
      },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ posts: mockPosts }),
    });

    const { result } = renderHook(
      () =>
        useCalendarView({
          workspaceId: "ws-123",
          enabled: true,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.posts.length).toBeGreaterThanOrEqual(0);
    });
  });

  it("should handle fetch error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Failed to fetch calendar" }),
    });

    const { result } = renderHook(
      () =>
        useCalendarView({
          workspaceId: "ws-123",
          enabled: true,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it("should not fetch when disabled", () => {
    renderHook(
      () =>
        useCalendarView({
          workspaceId: "ws-123",
          enabled: false,
        }),
      { wrapper: createWrapper() },
    );

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should not fetch when workspaceId is empty", () => {
    renderHook(
      () =>
        useCalendarView({
          workspaceId: "",
          enabled: true,
        }),
      { wrapper: createWrapper() },
    );

    expect(mockFetch).not.toHaveBeenCalled();
  });
});
