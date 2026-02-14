"use client";

import { useCallback, useEffect, useState } from "react";
import type { SwarmAgent } from "../types";

export function useAgents() {
  const [data, setData] = useState<SwarmAgent[] | undefined>();
  const [error, setError] = useState<Error | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  const fetchAgents = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/agents");
      if (!res.ok) throw new Error("Failed to fetch agents");
      const agents: SwarmAgent[] = await res.json();
      setData(agents);
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 10_000);
    return () => clearInterval(interval);
  }, [fetchAgents]);

  return { data, error, isLoading, mutate: fetchAgents };
}
