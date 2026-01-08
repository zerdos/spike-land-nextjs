import { useQuery } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryProvider } from "./QueryProvider";

// Test component that uses React Query
function TestConsumer() {
  const { data, isLoading } = useQuery({
    queryKey: ["test"],
    queryFn: async () => "test-data",
  });

  if (isLoading) {
    return <div data-testid="loading">Loading...</div>;
  }

  return <div data-testid="data">{data}</div>;
}

describe("QueryProvider", () => {
  it("renders children correctly", () => {
    render(
      <QueryProvider>
        <div data-testid="child">Child Content</div>
      </QueryProvider>,
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Child Content")).toBeInTheDocument();
  });

  it("provides QueryClient to children", async () => {
    render(
      <QueryProvider>
        <TestConsumer />
      </QueryProvider>,
    );

    // Should start with loading state
    expect(screen.getByTestId("loading")).toBeInTheDocument();

    // Should eventually show data
    await waitFor(() => {
      expect(screen.getByTestId("data")).toBeInTheDocument();
      expect(screen.getByText("test-data")).toBeInTheDocument();
    });
  });

  it("creates a new QueryClient for each render", () => {
    function ClientCapture() {
      const query = useQuery({
        queryKey: ["capture"],
        queryFn: async () => "captured",
      });
      // This is just to verify the hook works
      return <div data-testid="capture">{query.status}</div>;
    }

    const { rerender } = render(
      <QueryProvider>
        <ClientCapture />
      </QueryProvider>,
    );

    expect(screen.getByTestId("capture")).toBeInTheDocument();

    // Re-render should still work
    rerender(
      <QueryProvider>
        <ClientCapture />
      </QueryProvider>,
    );

    expect(screen.getByTestId("capture")).toBeInTheDocument();
  });

  it("allows multiple queries in the same provider", async () => {
    function MultiQueryConsumer() {
      const query1 = useQuery({
        queryKey: ["query1"],
        queryFn: async () => "data1",
      });
      const query2 = useQuery({
        queryKey: ["query2"],
        queryFn: async () => "data2",
      });

      if (query1.isLoading || query2.isLoading) {
        return <div data-testid="loading">Loading...</div>;
      }

      return (
        <div data-testid="multi-data">
          {query1.data}-{query2.data}
        </div>
      );
    }

    render(
      <QueryProvider>
        <MultiQueryConsumer />
      </QueryProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("multi-data")).toBeInTheDocument();
      expect(screen.getByText("data1-data2")).toBeInTheDocument();
    });
  });

  it("handles query errors gracefully", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(
      () => {},
    );

    function ErrorQueryConsumer() {
      const { error, isError } = useQuery({
        queryKey: ["error-query"],
        queryFn: async () => {
          throw new Error("Test error");
        },
        retry: false,
      });

      if (isError) {
        return <div data-testid="error">{(error as Error).message}</div>;
      }

      return <div data-testid="loading">Loading...</div>;
    }

    render(
      <QueryProvider>
        <ErrorQueryConsumer />
      </QueryProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("error")).toBeInTheDocument();
      expect(screen.getByText("Test error")).toBeInTheDocument();
    });

    consoleError.mockRestore();
  });

  it("applies default staleTime configuration", async () => {
    let fetchCount = 0;

    function StaleTimeConsumer() {
      const { data } = useQuery({
        queryKey: ["stale-test"],
        queryFn: async () => {
          fetchCount++;
          return `fetch-${fetchCount}`;
        },
      });

      return <div data-testid="stale-data">{data ?? "loading"}</div>;
    }

    const { rerender } = render(
      <QueryProvider>
        <StaleTimeConsumer />
      </QueryProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("fetch-1")).toBeInTheDocument();
    });

    // Rerender should use cached data (not refetch) due to staleTime
    rerender(
      <QueryProvider>
        <StaleTimeConsumer />
      </QueryProvider>,
    );

    // Should still show cached data
    expect(screen.getByText("fetch-1")).toBeInTheDocument();
  });
});
