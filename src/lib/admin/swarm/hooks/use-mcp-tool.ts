"use client";

import { useCallback, useEffect, useState } from "react";

async function callMcpTool(toolName: string, _input: Record<string, unknown> = {}): Promise<string> {
  // Placeholder: in production this would call the MCP endpoint
  return `Data for ${toolName}`;
}

export function useMcpTool(toolName: string, input?: Record<string, unknown>) {
  const [data, setData] = useState<string | undefined>();
  const [error, setError] = useState<Error | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await callMcpTool(toolName, input);
      setData(result);
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [toolName, input]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, error, isLoading, mutate: fetchData };
}
